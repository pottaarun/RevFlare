#!/usr/bin/env python3
"""Mock server: serves the frontend + returns mock API data for screenshots."""
import http.server
import json
import os
import threading

PORT = 8788
PUBLIC = os.path.join(os.path.dirname(__file__), 'public')

MOCK_STATS = {
    "totalAccounts": 2307, "activeAccounts": 20, "avgITSpend": 78400,
    "avgCDNSpend": 17200, "totalMRR": 131000, "totalAddressable": 167000000,
    "openPipeline": 62
}

MOCK_PLATFORM = {"totalEmails": 9, "totalResearch": 11, "totalCampaigns": 1, "totalUsers": 1}

MOCK_ACCOUNTS = {
    "accounts": [
        {"id":1,"account_name":"Apple Canada Inc","industry":"Telecommunications","status":"Unknown","total_it_spend":35300000,"current_monthly_fee":0,"cdn_primary":"Akamai","security_primary":"CrowdStrike","billing_country":"CA","employees":5000,"website":"apple.ca"},
        {"id":2,"account_name":"Equinix Canada Ltd","industry":"--","status":"Unknown","total_it_spend":22000000,"current_monthly_fee":0,"cdn_primary":"Amazon CloudFront","security_primary":"Neustar","billing_country":"CA","employees":12000,"website":"equinix.ca"},
        {"id":3,"account_name":"Hotbot Limited","industry":"Publishing","status":"Paid","total_it_spend":16600000,"current_monthly_fee":0,"cdn_primary":"Amazon CloudFront","security_primary":"Palo Alto Networks","billing_country":"CA","employees":800,"website":"hotbot.com","last_activity":"2026-01-15"},
        {"id":4,"account_name":"Intuit Canada Ulc","industry":"Computer Software","status":"Unknown","total_it_spend":15100000,"current_monthly_fee":0,"cdn_primary":"Blue Coat Systems","security_primary":"Verisign","billing_country":"CA","employees":15000,"website":"intuit.ca"},
        {"id":5,"account_name":"Trinity College","industry":"Colleges & Universities","status":"Unknown","total_it_spend":7100000,"current_monthly_fee":0,"cdn_primary":"Amazon CloudFront","security_primary":"Palo Alto Networks","billing_country":"CA","employees":600,"website":"trinity.utoronto.ca"},
        {"id":6,"account_name":"University Of Toronto Press","industry":"Media","status":"Unknown","total_it_spend":7100000,"current_monthly_fee":0,"cdn_primary":"Amazon CloudFront","security_primary":"Palo Alto Networks","billing_country":"CA","employees":200,"website":"utpress.utoronto.ca","last_activity":"2026-03-10"},
        {"id":7,"account_name":"Shopify Inc","industry":"Computer Software","status":"Paid","total_it_spend":45200000,"current_monthly_fee":5400,"cdn_primary":"Fastly","security_primary":"CrowdStrike","billing_country":"CA","employees":10000,"website":"shopify.com"},
        {"id":8,"account_name":"Rogers Communications","industry":"Telecommunications","status":"Unknown","total_it_spend":28700000,"current_monthly_fee":0,"cdn_primary":"Akamai","security_primary":"Palo Alto Networks","billing_country":"CA","employees":25000,"website":"rogers.com"},
    ],
    "total": 2307, "page": 1, "limit": 50
}

MOCK_FILTERS = {
    "industries":["Telecommunications","Computer Software","Media","Publishing","Colleges & Universities","Financial Services","Healthcare","Retail","Manufacturing"],
    "countries":["CA","US","GB","DE","FR","AU","JP","IN","BR","SG"],
    "segments":["Enterprise","Mid-Market","SMB"],
    "statuses":["Active","Paid","Unknown","Free","Not Renewed"]
}

MOCK_LEAD_SCORES = [
    {"id":7,"account_name":"Shopify Inc","industry":"Computer Software","score":92,"total_it_spend":45200000,"current_monthly_fee":5400,"factors":[{"factor":"IT Spend","points":20,"detail":"$45.2M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.01%"},{"factor":"Multi-Vendor Displacement","points":15,"detail":"3 vendors"}]},
    {"id":1,"account_name":"Apple Canada Inc","industry":"Telecommunications","score":85,"total_it_spend":35300000,"current_monthly_fee":0,"factors":[{"factor":"IT Spend","points":20,"detail":"$35.3M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.0%"},{"factor":"Competitor Present","points":8,"detail":"Akamai"}]},
    {"id":8,"account_name":"Rogers Communications","industry":"Telecommunications","score":78,"total_it_spend":28700000,"current_monthly_fee":0,"factors":[{"factor":"IT Spend","points":20,"detail":"$28.7M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.0%"},{"factor":"Enterprise","points":10,"detail":"25,000 employees"}]},
    {"id":2,"account_name":"Equinix Canada Ltd","industry":"--","score":72,"total_it_spend":22000000,"current_monthly_fee":0,"factors":[{"factor":"IT Spend","points":20,"detail":"$22.0M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.0%"},{"factor":"Enterprise","points":10,"detail":"12,000 employees"}]},
    {"id":3,"account_name":"Hotbot Limited","industry":"Publishing","score":65,"total_it_spend":16600000,"current_monthly_fee":0,"factors":[{"factor":"IT Spend","points":15,"detail":"$16.6M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.0%"},{"factor":"Recent Activity","points":10,"detail":"85 days ago"}]},
    {"id":4,"account_name":"Intuit Canada Ulc","industry":"Computer Software","score":58,"total_it_spend":15100000,"current_monthly_fee":0,"factors":[{"factor":"IT Spend","points":15,"detail":"$15.1M/mo"},{"factor":"Low Wallet Penetration","points":15,"detail":"0.0%"}]},
]

MOCK_OPPORTUNITIES = [
    {"id":1,"account_name":"Shopify Inc","industry":"Computer Software","country":"CA","acv":1320000,"stage":"qualification","notes":"High IT spend, multi-vendor displacement opportunity","created_at":"2026-04-10"},
    {"id":2,"account_name":"Apple Canada Inc","industry":"Telecommunications","country":"CA","acv":576000,"stage":"prospecting","notes":"Massive IT spend, using Akamai CDN - direct displacement target","created_at":"2026-04-10"},
    {"id":3,"account_name":"Rogers Communications","industry":"Telecommunications","country":"CA","acv":420000,"stage":"prospecting","notes":"Large enterprise, competitive stack ripe for consolidation","created_at":"2026-04-10"},
]

MOCK_ACV = {
    "totalAcv": 2316000,
    "byCountry": [{"country":"CA","total":2316000}],
    "byStage": [{"stage":"qualification","cnt":1,"total":1320000},{"stage":"prospecting","cnt":2,"total":996000}]
}

MOCK_ALERTS = [
    {"id":1,"alert_type":"infrastructure_change","title":"CDN Change: Shopify Inc","detail":"Fastly -> Cloudflare","severity":"high","read":0,"created_at":"2026-04-10T12:00:00Z"},
    {"id":2,"alert_type":"threat_match","title":"DDoS Attack: Telecom Sector","detail":"Major DDoS targeting Canadian telecoms","severity":"critical","read":0,"created_at":"2026-04-09T18:00:00Z"},
    {"id":3,"alert_type":"infrastructure_change","title":"DNS Change: Rogers Communications","detail":"Route53 -> Cloudflare DNS","severity":"medium","read":1,"created_at":"2026-04-08T10:00:00Z"},
]

MOCK_TEAM = {
    "users":[{"user_email":"apotta@cloudflare.com"}],
    "emailsByUser":[{"user_email":"apotta@cloudflare.com","cnt":9}],
    "researchByUser":[{"user_email":"apotta@cloudflare.com","cnt":11}],
    "campaignsByUser":[{"user_email":"apotta@cloudflare.com","cnt":1}],
    "opportunitiesByUser":[{"user_email":"apotta@cloudflare.com","cnt":3,"total_acv":2316000}]
}

MOCK_PLAYBOOKS = [
    {"id":1,"name":"Competitive Displacement - Akamai","persona":"ae","industry":"","template":"## Akamai Displacement Playbook\n\n**Talk Track:**\n1. Acknowledge their investment in Akamai\n2. Highlight Cloudflare's integrated platform advantage\n3. Present POC for CDN + Security bundle\n\n**Objection Handling:**\n- 'We've been with Akamai for years' -> Focus on cost savings and modern architecture\n- 'Migration risk' -> Reference zero-downtime migration playbook","usage_count":5,"created_by":"apotta@cloudflare.com"},
    {"id":2,"name":"Zero Trust Initial Outreach","persona":"bdr","industry":"Financial Services","template":"## ZT Discovery Framework\n\n1. Ask about remote workforce size\n2. Current VPN pain points\n3. Compliance requirements (SOC2, PCI)\n4. Cloud migration timeline","usage_count":3,"created_by":"apotta@cloudflare.com"},
]

ROUTES = {
    '/api/stats': MOCK_STATS,
    '/api/platform-stats': MOCK_PLATFORM,
    '/api/accounts': MOCK_ACCOUNTS,
    '/api/filters': MOCK_FILTERS,
    '/api/lead-scores': MOCK_LEAD_SCORES,
    '/api/opportunities': MOCK_OPPORTUNITIES,
    '/api/acv': MOCK_ACV,
    '/api/alerts': MOCK_ALERTS,
    '/api/team-stats': MOCK_TEAM,
    '/api/playbooks': MOCK_PLAYBOOKS,
    '/api/me': {"email":"apotta@cloudflare.com","accountCount":2307},
    '/api/gmail/status': {"connected":False},
    '/api/settings/status': {},
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            data = ROUTES.get(path, [])
            self.wfile.write(json.dumps(data).encode())
            return
        # Serve index.html for hash routes
        if not '.' in path.split('/')[-1] and path != '/':
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'{"success":true}')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, *a): pass  # Suppress logs

if __name__ == '__main__':
    server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Mock server on http://localhost:{PORT}')
    server.serve_forever()
