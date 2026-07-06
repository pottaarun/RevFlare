#!/usr/bin/env python3
"""Generate a premium RevFlare presentation (.pptx)"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import math

# ── Brand Colors ──────────────────────────────────────────────────
BG_DARK = RGBColor(0x08, 0x09, 0x0A)
BG_PANEL = RGBColor(0x0F, 0x10, 0x11)
BG_SURFACE = RGBColor(0x16, 0x17, 0x18)
BG_ELEVATED = RGBColor(0x1E, 0x1F, 0x21)
ACCENT = RGBColor(0x5E, 0x6A, 0xD2)
ACCENT_BRIGHT = RGBColor(0x7C, 0x7F, 0xFF)
GREEN = RGBColor(0x34, 0xD3, 0x99)
AMBER = RGBColor(0xFB, 0xBF, 0x24)
RED = RGBColor(0xF8, 0x71, 0x71)
BLUE = RGBColor(0x60, 0xA5, 0xFA)
PURPLE = RGBColor(0xA7, 0x8B, 0xFA)
ORANGE = RGBColor(0xFB, 0x92, 0x3C)
WHITE = RGBColor(0xF7, 0xF8, 0xF8)
LIGHT_GRAY = RGBColor(0xC4, 0xC9, 0xD4)
MUTED = RGBColor(0x8A, 0x8F, 0x98)
DIM = RGBColor(0x5A, 0x5E, 0x66)
CF_ORANGE = RGBColor(0xF6, 0x82, 0x1F)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
W = prs.slide_width
H = prs.slide_height


def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, color, alpha=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    shape.rotation = 0.0
    return shape


def add_text(slide, left, top, width, height, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT, font_name='Calibri'):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = align
    return txBox


def add_para(tf, text, size=14, color=LIGHT_GRAY, bold=False, space_before=Pt(4), align=PP_ALIGN.LEFT):
    p = tf.add_paragraph()
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Calibri'
    p.space_before = space_before
    p.alignment = align
    return p


def add_accent_line(slide, left, top, width):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(3))
    shape.fill.solid()
    shape.fill.fore_color.rgb = ACCENT_BRIGHT
    shape.line.fill.background()
    return shape


def add_stat_card(slide, left, top, width, height, value, label, color, bg_color=BG_ELEVATED):
    card = add_rect(slide, left, top, width, height, bg_color)
    # Accent top bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(3))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    # Value
    add_text(slide, left + Inches(0.25), top + Inches(0.25), width - Inches(0.5), Inches(0.6),
             value, size=28, color=color, bold=True)
    # Label
    add_text(slide, left + Inches(0.25), top + Inches(0.75), width - Inches(0.5), Inches(0.4),
             label, size=11, color=MUTED)


def add_bullet_list(slide, left, top, width, items, size=14, color=LIGHT_GRAY, icon_color=GREEN):
    txBox = slide.shapes.add_textbox(left, top, width, Inches(len(items) * 0.42))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = item
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.name = 'Calibri'
        p.space_before = Pt(6)
        # Use a colored bullet
        pPr = p._pPr
        if pPr is None:
            from pptx.oxml.ns import qn
            pPr = p._p.get_or_add_pPr()
    return txBox


# ══════════════════════════════════════════════════════════════════
# SLIDE 1: Title
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank
set_bg(slide, BG_DARK)

# Ambient glow
glow = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(3), Inches(-1), Inches(7), Inches(5))
glow.fill.solid()
glow.fill.fore_color.rgb = RGBColor(0x1A, 0x1D, 0x3A)
glow.line.fill.background()

# Top accent line
add_accent_line(slide, Inches(1.5), Inches(1.8), Inches(2))

# Title
add_text(slide, Inches(1.5), Inches(2.0), Inches(10), Inches(1.2),
         'RevFlare', size=64, color=WHITE, bold=True)

# Subtitle
add_text(slide, Inches(1.5), Inches(3.2), Inches(8), Inches(0.8),
         'AI-Powered Sales Intelligence for Cloudflare', size=28, color=ACCENT_BRIGHT)

# Description
add_text(slide, Inches(1.5), Inches(4.2), Inches(7), Inches(1.0),
         'A single Cloudflare Worker powering deep account research, persona-curated outreach, '
         'competitive intelligence, threat monitoring, and autonomous pipeline generation.',
         size=15, color=MUTED)

# Stats row at bottom
stats = [
    ('2,307', 'Accounts', GREEN),
    ('60+', 'API Endpoints', BLUE),
    ('3', 'AI Models', PURPLE),
    ('25', 'Email Variants', AMBER),
    ('40+', 'Competitors', ORANGE),
]
for i, (val, label, col) in enumerate(stats):
    x = Inches(1.5 + i * 2.2)
    add_stat_card(slide, x, Inches(5.6), Inches(1.9), Inches(1.1), val, label, col)

# Cloudflare badge
add_text(slide, Inches(9.5), Inches(6.8), Inches(3), Inches(0.4),
         'Built on Cloudflare Workers', size=11, color=DIM, align=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════════
# SLIDE 2: The Problem
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(6), Inches(0.7),
         'The Problem', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(8), Inches(0.5),
         'Sales reps spend more time researching than selling', size=16, color=MUTED)

problems = [
    ('Hours of Manual Research', 'Reps toggle between 10+ tabs to understand a single account\'s tech stack, competitors, and buying signals', RED),
    ('Generic Outreach', 'Cookie-cutter emails get <2% reply rates. Every prospect gets the same template regardless of their stack or pain points', AMBER),
    ('Missed Trigger Events', 'Infrastructure changes, security incidents, and competitor moves go unnoticed until it\'s too late', ORANGE),
    ('No Pipeline Intelligence', 'Opportunities are created manually with gut-feel ACV estimates and no data-driven prioritization', PURPLE),
]

for i, (title, desc, color) in enumerate(problems):
    y = Inches(2.5 + i * 1.15)
    # Card
    card = add_rect(slide, Inches(1), y, Inches(11), Inches(0.95), BG_SURFACE)
    # Color indicator
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1), y, Pt(4), Inches(0.95))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    # Title
    add_text(slide, Inches(1.4), y + Inches(0.08), Inches(4), Inches(0.35),
             title, size=16, color=color, bold=True)
    # Desc
    add_text(slide, Inches(1.4), y + Inches(0.42), Inches(10), Inches(0.45),
             desc, size=12, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 3: Architecture
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'Architecture: 100% Cloudflare Edge', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         'Single Worker. Zero external infrastructure. Global edge deployment.', size=16, color=MUTED)

# Services grid
services = [
    ('Workers', 'Application server\n~3,500 lines TypeScript', ACCENT_BRIGHT),
    ('D1', 'SQLite database\n17 tables, user-scoped', GREEN),
    ('Workers AI', '3 models: DeepSeek R1,\nLlama 3.3 70B, Llama 3.1 8B', PURPLE),
    ('Browser Rendering', 'Headless Chromium\nLive website scraping', BLUE),
    ('Workers KV', 'Threat intel cache\nURL dedup + TTL', AMBER),
    ('Cloudflare Access', 'JWT authentication\nZero Trust', RED),
]

for i, (name, desc, color) in enumerate(services):
    col = i % 3
    row = i // 3
    x = Inches(1 + col * 3.8)
    y = Inches(2.6 + row * 2.0)
    card = add_rect(slide, x, y, Inches(3.4), Inches(1.6), BG_SURFACE)
    # Top accent
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(3.4), Pt(3))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    add_text(slide, x + Inches(0.2), y + Inches(0.2), Inches(3), Inches(0.35),
             name, size=18, color=color, bold=True)
    add_text(slide, x + Inches(0.2), y + Inches(0.6), Inches(3), Inches(0.8),
             desc, size=12, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 4: Live Research Engine
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         '8-Probe Live Research Engine', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         'Real-time intelligence from 8 parallel data sources -- not AI hallucinations.', size=16, color=MUTED)

probes = [
    ('Website Scraper', 'Puppeteer + fetch', 'Title, meta, careers, tech signals, investor relations', BLUE),
    ('HTTP Headers', 'HEAD request', 'CDN detection, server, security header audit', GREEN),
    ('DNS Records', 'Cloudflare DoH', 'A, CNAME, MX, NS + provider detection', ACCENT_BRIGHT),
    ('SEC EDGAR', 'EFTS + submissions', 'Filings, CIK, ticker, SIC code', PURPLE),
    ('News Search', 'Google/Bing/DDG', 'Recent headlines and press coverage', AMBER),
    ('Funding Data', 'Crunchbase + News', 'Total funding, last round, investors', ORANGE),
    ('Intricately', 'HG Cloud API', 'IT spend, product deployments, traffic', RED),
    ('Cloudflare Radar', 'CF API', 'Domain rank, categories, protocol mix', CF_ORANGE),
]

for i, (name, source, data, color) in enumerate(probes):
    col = i % 2
    row = i // 2
    x = Inches(1 + col * 5.8)
    y = Inches(2.6 + row * 1.1)
    card = add_rect(slide, x, y, Inches(5.4), Inches(0.9), BG_SURFACE)
    # Number badge
    badge = add_rect(slide, x + Inches(0.15), y + Inches(0.15), Inches(0.45), Inches(0.6), BG_ELEVATED)
    add_text(slide, x + Inches(0.15), y + Inches(0.18), Inches(0.45), Inches(0.35),
             str(i + 1), size=16, color=color, bold=True, align=PP_ALIGN.CENTER)
    # Content
    add_text(slide, x + Inches(0.75), y + Inches(0.08), Inches(4.5), Inches(0.3),
             name, size=14, color=color, bold=True)
    add_text(slide, x + Inches(0.75), y + Inches(0.38), Inches(4.5), Inches(0.2),
             f'{source}  |  {data}', size=10, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 5: AI Models & Persona System
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'AI-Powered Persona Engine', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         '5 personas x 5 message types = 25 hyper-personalized email variants per account.', size=16, color=MUTED)

# AI Models
add_text(slide, Inches(1), Inches(2.5), Inches(4), Inches(0.35),
         'AI MODELS', size=11, color=DIM, bold=True)

models = [
    ('DeepSeek R1 32B', 'Deep research, battlecards, reasoning', PURPLE),
    ('Llama 3.3 70B', 'Emails, campaigns, structured output', GREEN),
    ('Llama 3.1 8B', 'Quick enrichment, search ranking', BLUE),
]
for i, (name, use, color) in enumerate(models):
    y = Inches(2.9 + i * 0.65)
    card = add_rect(slide, Inches(1), y, Inches(5), Inches(0.5), BG_SURFACE)
    add_text(slide, Inches(1.2), y + Inches(0.05), Inches(2.5), Inches(0.3),
             name, size=13, color=color, bold=True)
    add_text(slide, Inches(1.2), y + Inches(0.28), Inches(4.5), Inches(0.2),
             use, size=10, color=MUTED)

# Personas
add_text(slide, Inches(7), Inches(2.5), Inches(5), Inches(0.35),
         '5 SALES PERSONAS', size=11, color=DIM, bold=True)

personas = [
    ('BDR', 'Cold Email, LinkedIn, Call Script, Follow-Up, Displacement', BLUE),
    ('AE', 'Executive Email, Proposal, ROI Case, Champion Enable', GREEN),
    ('CSM', 'QBR Talking Points, Expansion, Health Check, Renewal', AMBER),
    ('SE', 'Technical Brief, Migration Plan, POC Proposal, Arch Review', PURPLE),
    ('VP Sales', 'Executive Brief, CxO Outreach, Board Talking Points', RED),
]
for i, (name, types, color) in enumerate(personas):
    y = Inches(2.9 + i * 0.72)
    card = add_rect(slide, Inches(7), y, Inches(5.5), Inches(0.58), BG_SURFACE)
    badge = add_rect(slide, Inches(7.15), y + Inches(0.1), Inches(0.7), Inches(0.38), BG_ELEVATED)
    add_text(slide, Inches(7.15), y + Inches(0.08), Inches(0.7), Inches(0.3),
             name, size=11, color=color, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, Inches(8.0), y + Inches(0.05), Inches(4.3), Inches(0.2),
             name + ' Persona', size=12, color=WHITE, bold=True)
    add_text(slide, Inches(8.0), y + Inches(0.3), Inches(4.3), Inches(0.2),
             types, size=9, color=MUTED)

# Divider
add_text(slide, Inches(1), Inches(6.7), Inches(11), Inches(0.3),
         'Every email is individually researched with live data -- not template-filled.', size=12, color=DIM, align=PP_ALIGN.CENTER)


# ══════════════════════════════════════════════════════════════════
# SLIDE 6: 15 Advanced Features
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         '15 Advanced Features', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         'Every tool a sales rep needs -- from lead scoring to AI-generated meeting prep.', size=16, color=MUTED)

features = [
    ('Lead Scoring', 'AI-scored leaderboard\n8 weighted factors', GREEN),
    ('ROI Calculator', 'Savings across 6\nspend categories', BLUE),
    ('Lookalike Finder', 'Similar accounts by\nindustry & stack', PURPLE),
    ('Meeting Prep', 'AI call brief with\ntalk tracks', AMBER),
    ('Multi-Touch Sequences', 'Email + phone +\nLinkedIn cadences', ORANGE),
    ('Change Detection', 'CDN/DNS/server\ninfra scanning', RED),
    ('A/B Email Testing', 'Business vs technical\nhook variants', ACCENT_BRIGHT),
    ('Voice Notes', 'Call notes to\nfollow-up email', GREEN),
    ('Alerts Dashboard', 'Infra changes &\nthreat matches', RED),
    ('Team Dashboard', 'Activity leaderboard\nacross all users', BLUE),
    ('Playbooks', 'Reusable templates\nwith usage tracking', PURPLE),
    ('Semantic Search', 'AI-ranked search\nacross all intel', AMBER),
    ('Pipeline & ACV', 'Opportunity CRUD\nwith ACV tracking', GREEN),
    ('Win/Loss Analysis', 'AI analysis of\nclosed opportunities', ORANGE),
    ('Opportunity Agent', 'Auto-generate deals\nDeepSeek + Llama', ACCENT_BRIGHT),
]

for i, (name, desc, color) in enumerate(features):
    col = i % 5
    row = i // 5
    x = Inches(0.6 + col * 2.45)
    y = Inches(2.5 + row * 1.55)
    card = add_rect(slide, x, y, Inches(2.2), Inches(1.3), BG_SURFACE)
    # Top accent
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(2.2), Pt(2))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    add_text(slide, x + Inches(0.12), y + Inches(0.15), Inches(2), Inches(0.3),
             name, size=12, color=color, bold=True)
    add_text(slide, x + Inches(0.12), y + Inches(0.5), Inches(2), Inches(0.7),
             desc, size=10, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 7: Opportunity Agent (Daisy-Chain)
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'Autonomous Opportunity Agent', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         'Daisy-chained AI pipeline: DeepSeek R1 reasons, Llama 3.3 70B structures. Zero manual input.', size=16, color=MUTED)

# Pipeline steps
steps = [
    ('1', 'Load & Score', 'Fetch all accounts,\ncompute lead scores\n(8 factors, 0-100)', BLUE),
    ('2', 'Filter', 'Remove accounts with\nexisting opps.\nThreshold: score >= 30', AMBER),
    ('3', 'DeepSeek R1', 'Deep reasoning:\naddressable spend,\ndisplacement potential', PURPLE),
    ('4', 'Llama 3.3 70B', 'Structured JSON:\nstage, ACV estimate,\nactionable notes', GREEN),
    ('5', 'Create Opps', 'Insert into pipeline\nwith all fields\nauto-populated', CF_ORANGE),
]

for i, (num, title, desc, color) in enumerate(steps):
    x = Inches(0.7 + i * 2.45)
    y = Inches(2.8)
    # Card
    card = add_rect(slide, x, y, Inches(2.2), Inches(2.4), BG_SURFACE)
    # Number circle
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.75), y + Inches(0.2), Inches(0.6), Inches(0.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    add_text(slide, x + Inches(0.75), y + Inches(0.22), Inches(0.6), Inches(0.5),
             num, size=20, color=BG_DARK, bold=True, align=PP_ALIGN.CENTER)
    # Title
    add_text(slide, x + Inches(0.15), y + Inches(1.0), Inches(1.9), Inches(0.3),
             title, size=14, color=color, bold=True, align=PP_ALIGN.CENTER)
    # Desc
    add_text(slide, x + Inches(0.15), y + Inches(1.35), Inches(1.9), Inches(0.9),
             desc, size=10, color=MUTED, align=PP_ALIGN.CENTER)

    # Arrow between steps
    if i < len(steps) - 1:
        add_text(slide, x + Inches(2.2), y + Inches(0.9), Inches(0.25), Inches(0.4),
                 '\u2192', size=20, color=DIM, align=PP_ALIGN.CENTER)

# Bottom callout
callout = add_rect(slide, Inches(1), Inches(5.8), Inches(11.3), Inches(0.8), BG_SURFACE)
add_text(slide, Inches(1.3), Inches(5.9), Inches(10.7), Inches(0.6),
         'One click generates realistic ACV estimates (2-8% of addressable IT spend), assigns deal stages '
         'based on engagement signals, and writes actionable sales notes -- all from account data alone.',
         size=13, color=LIGHT_GRAY)


# ══════════════════════════════════════════════════════════════════
# SLIDE 8: Competitive Intelligence
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'Competitive Intel & Threat Monitoring', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         '12 product categories, 40+ competitors with live-scraped battlecards. 26 threat feeds.', size=16, color=MUTED)

# Left: Competitive categories
add_text(slide, Inches(1), Inches(2.5), Inches(5), Inches(0.3),
         'COMPETITIVE CATEGORIES', size=11, color=DIM, bold=True)

categories = [
    'CDN  --  vs Akamai, CloudFront, Fastly',
    'WAF  --  vs Imperva, AWS WAF, F5',
    'DDoS  --  vs Akamai Prolexic, AWS Shield',
    'Zero Trust  --  vs Zscaler, Palo Alto, Netskope',
    'Edge Compute  --  vs Lambda@Edge, Vercel',
    'DNS  --  vs Route 53, NS1, Google DNS',
]
for i, cat in enumerate(categories):
    y = Inches(2.9 + i * 0.55)
    card = add_rect(slide, Inches(1), y, Inches(5.5), Inches(0.42), BG_SURFACE)
    add_text(slide, Inches(1.2), y + Inches(0.06), Inches(5.2), Inches(0.3),
             cat, size=11, color=LIGHT_GRAY)

# Right: Threat Intel
add_text(slide, Inches(7), Inches(2.5), Inches(5), Inches(0.3),
         'THREAT INTELLIGENCE', size=11, color=DIM, bold=True)

threat_items = [
    ('26 RSS Feeds', 'Real-time cybersecurity incident monitoring', RED),
    ('GDELT + News', 'Google, Bing, NewsAPI, GNews, MediaStack', AMBER),
    ('Auto-Matching', 'Incidents matched to accounts by industry & country', BLUE),
    ('Trigger Emails', 'One-click incident-based outreach generation', GREEN),
    ('Nightly Cron', 'Automated daily scan with alert generation', PURPLE),
]
for i, (title, desc, color) in enumerate(threat_items):
    y = Inches(2.9 + i * 0.72)
    card = add_rect(slide, Inches(7), y, Inches(5.5), Inches(0.58), BG_SURFACE)
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7), y, Pt(3), Inches(0.58))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    add_text(slide, Inches(7.25), y + Inches(0.05), Inches(5), Inches(0.22),
             title, size=12, color=color, bold=True)
    add_text(slide, Inches(7.25), y + Inches(0.3), Inches(5), Inches(0.22),
             desc, size=10, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 9: Security & Integrations
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'Security & Integrations', size=40, color=WHITE, bold=True)
add_text(slide, Inches(1), Inches(1.7), Inches(9), Inches(0.5),
         'Enterprise-grade security with Cloudflare Access, AES-256 encryption, and SSRF/XSS protection.', size=16, color=MUTED)

# Security items
sec_items = [
    ('Cloudflare Access', 'JWT-based Zero Trust authentication', GREEN),
    ('AES-256-GCM', 'Encrypted credential storage in D1', BLUE),
    ('SSRF Prevention', 'Domain validation blocks internal/private URLs', RED),
    ('XSS Protection', 'HTML entity escaping on all user content', AMBER),
    ('SOQL Injection', 'Parameterized Salesforce queries', PURPLE),
    ('CORS Restriction', 'Origin-locked API access', ACCENT_BRIGHT),
]
for i, (title, desc, color) in enumerate(sec_items):
    col = i % 2
    row = i // 2
    x = Inches(1 + col * 5.8)
    y = Inches(2.5 + row * 1.0)
    card = add_rect(slide, x, y, Inches(5.4), Inches(0.8), BG_SURFACE)
    add_text(slide, x + Inches(0.2), y + Inches(0.08), Inches(5), Inches(0.28),
             title, size=14, color=color, bold=True)
    add_text(slide, x + Inches(0.2), y + Inches(0.4), Inches(5), Inches(0.28),
             desc, size=11, color=MUTED)

# Integrations
add_text(slide, Inches(1), Inches(5.5), Inches(5), Inches(0.3),
         'INTEGRATIONS', size=11, color=DIM, bold=True)

integrations = [
    ('Gmail OAuth', 'Send emails directly from connected Gmail', GREEN),
    ('Salesforce OAuth', 'Push activities, pull opportunities', BLUE),
    ('Shareable Links', 'Tokenized public URLs with auto-expiry', PURPLE),
]
for i, (title, desc, color) in enumerate(integrations):
    x = Inches(1 + i * 3.8)
    y = Inches(5.9)
    card = add_rect(slide, x, y, Inches(3.4), Inches(0.7), BG_SURFACE)
    add_text(slide, x + Inches(0.2), y + Inches(0.05), Inches(3), Inches(0.25),
             title, size=13, color=color, bold=True)
    add_text(slide, x + Inches(0.2), y + Inches(0.35), Inches(3), Inches(0.25),
             desc, size=10, color=MUTED)


# ══════════════════════════════════════════════════════════════════
# SLIDE 10: By the Numbers + CTA
# ══════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide, BG_DARK)

# Ambient glow
glow = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(3), Inches(0), Inches(7), Inches(5))
glow.fill.solid()
glow.fill.fore_color.rgb = RGBColor(0x1A, 0x1D, 0x3A)
glow.line.fill.background()

add_accent_line(slide, Inches(1), Inches(0.8), Inches(1.5))
add_text(slide, Inches(1), Inches(1.0), Inches(10), Inches(0.7),
         'RevFlare by the Numbers', size=40, color=WHITE, bold=True)

# Big stats grid
big_stats = [
    ('~8,600', 'Lines of Code', GREEN),
    ('9', 'Source Files', BLUE),
    ('17', 'Database Tables', PURPLE),
    ('60+', 'API Endpoints', AMBER),
    ('8', 'Live Data Probes', ORANGE),
    ('25', 'Email Variants', RED),
    ('12', 'Competitive Categories', ACCENT_BRIGHT),
    ('40+', 'Competitors Tracked', CF_ORANGE),
    ('26', 'Threat RSS Feeds', RED),
    ('8', 'Campaign Themes', GREEN),
]

for i, (val, label, color) in enumerate(big_stats):
    col = i % 5
    row = i // 5
    x = Inches(0.7 + col * 2.45)
    y = Inches(2.2 + row * 1.6)
    add_stat_card(slide, x, y, Inches(2.2), Inches(1.2), val, label, color)

# CTA
cta = add_rect(slide, Inches(2.5), Inches(5.6), Inches(8.3), Inches(1.2), BG_SURFACE)
add_text(slide, Inches(2.5), Inches(5.7), Inches(8.3), Inches(0.5),
         'revflare.arunpotta1024.workers.dev', size=22, color=ACCENT_BRIGHT, bold=True, align=PP_ALIGN.CENTER)
add_text(slide, Inches(2.5), Inches(6.2), Inches(8.3), Inches(0.4),
         'github.com/pottaarun/RevFlare', size=14, color=MUTED, align=PP_ALIGN.CENTER)
add_text(slide, Inches(2.5), Inches(6.55), Inches(8.3), Inches(0.3),
         'Built by Arun Potta  |  Powered by Cloudflare Workers + AI', size=12, color=DIM, align=PP_ALIGN.CENTER)


# ── Save ──────────────────────────────────────────────────────────
out = 'RevFlare-Presentation.pptx'
prs.save(out)
print(f'Saved: {out}')
print(f'Slides: {len(prs.slides)}')
