#!/usr/bin/env python3
"""Capture screenshots of RevFlare pages using Playwright."""
import os
os.environ['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8788'
OUT = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(OUT, exist_ok=True)

PAGES = [
    ('dashboard', f'{BASE}/#/', 'Dashboard - Account Intelligence'),
    ('pipeline', f'{BASE}/#/pipeline', 'Pipeline & Opportunities'),
    ('lead_scores', f'{BASE}/#/lead-scores', 'Lead Scoring Leaderboard'),
    ('alerts', f'{BASE}/#/alerts', 'Alerts & Notifications'),
    ('team', f'{BASE}/#/team', 'Team Dashboard'),
    ('playbooks', f'{BASE}/#/playbooks', 'Playbooks'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path='/opt/homebrew/lib/python3.14/site-packages/playwright/driver/package/.local-browsers/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
    )
    ctx = browser.new_context(
        viewport={'width': 1440, 'height': 900},
        device_scale_factor=2,  # Retina
        color_scheme='dark',
    )

    for name, url, desc in PAGES:
        page = ctx.new_page()
        print(f'Capturing: {name} ({url})')
        page.goto(url, wait_until='networkidle', timeout=15000)
        page.wait_for_timeout(1500)  # Let animations finish
        path = os.path.join(OUT, f'{name}.png')
        page.screenshot(path=path, full_page=False)
        print(f'  -> {path}')
        page.close()

    browser.close()
    print(f'\nDone! {len(PAGES)} screenshots saved to {OUT}/')
