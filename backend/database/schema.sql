-- Table 1: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT,
    product TEXT,
    target_customer TEXT,
    price TEXT,
    usp TEXT,
    industry TEXT,
    target_city TEXT,
    outreach_channel TEXT,
    gmail_user TEXT,
    whatsapp_number TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT now()
);

-- Table 2: leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    name TEXT,
    business_name TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    source TEXT,
    score INTEGER,
    score_reason TEXT,
    address TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
);

-- Table 3: messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    email_subject TEXT,
    email_body TEXT,
    whatsapp_msg TEXT,
    approval_status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- Table 4: replies
CREATE TABLE IF NOT EXISTS replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    reply_text TEXT,
    reply_channel TEXT,
    sentiment TEXT,
    interest_score INTEGER,
    strategy TEXT,
    draft_reply TEXT,
    replied_at TIMESTAMP DEFAULT now()
);

-- Table 5: deals
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    deal_status TEXT DEFAULT 'open',
    closing_message TEXT,
    detected_at TIMESTAMP DEFAULT now(),
    notes TEXT,
    converted BOOLEAN DEFAULT false
);

-- Table 6: lead_intelligence
CREATE TABLE IF NOT EXISTS lead_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    business_name TEXT,
    city TEXT,
    email TEXT,
    phone TEXT,
    niche TEXT,
    score INTEGER,
    sentiment TEXT,
    status TEXT,
    campaign_id TEXT,
    deal_closed BOOLEAN,
    converted BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now()
);
