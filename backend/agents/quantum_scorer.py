"""
quantum_scorer.py  —  Drop this into your agents/ folder.

Behaviour-based lead scoring with Qiskit quantum optimization.

Score ladder (classical base):
  email_sent        → 20
  replied           → 40
  interested        → 60
  price_negotiating → 80
  deal_closed       → 100

The quantum layer (QAOA-inspired) then re-ranks leads that share
the same base score by measuring secondary signals simultaneously:
  • reply_speed   (how fast they replied)
  • sentiment     (interested > price_objection > not_interested)
  • reply_count   (how many times they replied)
  • has_email     (email contact available)
  • has_phone     (phone contact available)

This gives every lead a final float score (0–100) so the dashboard
can rank them precisely instead of lumping them in the same bucket.
"""

import math
from typing import Optional

# ── Qiskit imports (real quantum) ──────────────────────────────────────────
try:
    from qiskit import QuantumCircuit
    from qiskit_aer import AerSimulator
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False
    print("[quantum_scorer] Qiskit not found — using classical fallback.")


# ── Sentiment weights ──────────────────────────────────────────────────────
SENTIMENT_WEIGHT = {
    "interested":        1.0,
    "price_objection":   0.7,
    "price_negotiating": 0.8,
    "busy_not_now":      0.4,
    "has_supplier":      0.3,
    "not_interested":    0.1,
    "unknown":           0.5,
}


def _classical_base_score(status: str) -> int:
    """Return the base score from the behaviour ladder."""
    ladder = {
        "new":       0,
        "pending":   0,
        "generated": 10,
        "sent":      20,
        "replied":   40,
        "interested":60,
        "negotiating":80,
        "closed":    100,
    }
    return ladder.get(status, 0)


def _quantum_boost(signals: dict) -> float:
    """
    Run a small Qiskit quantum circuit to produce a boost value (0–20).

    We encode 4 binary signals into 4 qubits, apply Hadamard + RY rotations
    (proportional to each signal's strength), measure all qubits, and use
    the probability of the |1111⟩ state as the boost magnitude.

    Signals dict keys expected:
        sentiment_score  float  0.0–1.0
        reply_speed      float  0.0–1.0   (1 = fast, 0 = slow/no reply)
        reply_count      float  0.0–1.0   (normalised, max 5 replies = 1.0)
        contact_richness float  0.0–1.0   (has both email+phone = 1.0)
    """
    if not QISKIT_AVAILABLE:
        # Classical fallback: weighted average * 20
        vals = list(signals.values())
        return sum(vals) / len(vals) * 20

    s  = signals.get("sentiment_score",  0.5)
    rs = signals.get("reply_speed",      0.5)
    rc = signals.get("reply_count",      0.0)
    cr = signals.get("contact_richness", 0.5)

    qc = QuantumCircuit(4, 4)

    # Hadamard puts each qubit in superposition
    qc.h([0, 1, 2, 3])

    # RY rotation encodes signal strength — angle ∈ [0, π]
    qc.ry(s  * math.pi, 0)
    qc.ry(rs * math.pi, 1)
    qc.ry(rc * math.pi, 2)
    qc.ry(cr * math.pi, 3)

    # Entangle qubits so all signals interact (QAOA-style)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.cx(2, 3)
    qc.cx(3, 0)

    qc.measure([0, 1, 2, 3], [0, 1, 2, 3])

    simulator = AerSimulator()
    job    = simulator.run(qc, shots=512)
    counts = job.result().get_counts()

    # Probability of all-1 state = how "hot" all signals are together
    all_ones = counts.get("1111", 0) / 512
    boost    = all_ones * 20          # scale to 0–20 range

    return round(boost, 2)


def compute_quantum_score(
    lead: dict,
    latest_reply: Optional[dict] = None,
    reply_count: int = 0,
) -> dict:
    """
    Public function called from main.py.

    Parameters
    ----------
    lead         : lead row from Supabase
    latest_reply : latest reply row from replies table (or None)
    reply_count  : total number of replies received

    Returns
    -------
    dict with keys: score (int), quantum_boost (float), reason (str),
                    badge (str), sentiment (str)
    """

    status   = lead.get("status", "new")
    base     = _classical_base_score(status)

    # ── Sentiment from latest reply ────────────────────────────────
    sentiment      = "unknown"
    interest_score = 0
    if latest_reply:
        sentiment      = latest_reply.get("sentiment", "unknown")
        interest_score = latest_reply.get("interest_score", 0) or 0

        # Override base score if reply carries a higher interest score
        # e.g. negotiator says interest_score=80 → use that as base
        if interest_score > base:
            base = interest_score

    sentiment_score = SENTIMENT_WEIGHT.get(sentiment, 0.5)

    # ── Reply speed signal (0–1) ───────────────────────────────────
    # We don't have timestamps here so use reply_count as proxy
    reply_speed = min(reply_count / 3.0, 1.0)   # 3+ replies = max speed

    # ── Reply count signal (0–1) ───────────────────────────────────
    rc_signal = min(reply_count / 5.0, 1.0)

    # ── Contact richness (0–1) ─────────────────────────────────────
    has_email = 1 if lead.get("email") else 0
    has_phone = 1 if lead.get("phone") else 0
    contact_richness = (has_email + has_phone) / 2.0

    signals = {
        "sentiment_score":  sentiment_score,
        "reply_speed":      reply_speed,
        "reply_count":      rc_signal,
        "contact_richness": contact_richness,
    }

    boost       = _quantum_boost(signals)
    final_score = min(int(base + boost), 100)

    # ── Badge ──────────────────────────────────────────────────────
    if final_score >= 80:
        badge = "Hot"
    elif final_score >= 50:
        badge = "Warm"
    elif final_score >= 20:
        badge = "Cold"
    else:
        badge = "New"

    reason = (
        f"Base: {base} (status={status}) | "
        f"Sentiment: {sentiment} | "
        f"Replies: {reply_count} | "
        f"Quantum boost: +{boost:.1f} | "
        f"Final: {final_score}"
    )

    return {
        "score":         final_score,
        "quantum_boost": boost,
        "reason":        reason,
        "badge":         badge,
        "sentiment":     sentiment,
    }
