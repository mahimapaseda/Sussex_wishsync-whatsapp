import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT_DIR, "docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
PPTX_PATH = os.path.join(OUTPUT_DIR, "Sussex_College_Systems_Presentation.pptx")

# -------------------------------------------------------------
# Color Palette (Simple, clean, professional white background)
# -------------------------------------------------------------
COLOR_BG = RGBColor(255, 255, 255)         # Pure White
COLOR_CARD_BG = RGBColor(248, 250, 252)    # Soft Slate / Off-white #F8FAFC
COLOR_BORDER = RGBColor(226, 232, 240)     # Light Grey Border #E2E8F0
COLOR_PRIMARY = RGBColor(15, 39, 68)       # Deep Sussex Navy #0F2744
COLOR_TITLE = RGBColor(15, 23, 42)         # Slate 900 #0F172A
COLOR_BODY = RGBColor(51, 65, 85)          # Slate 700 #334155
COLOR_MUTED = RGBColor(100, 116, 139)      # Slate 500 #64748B
COLOR_ACCENT_BLUE = RGBColor(29, 78, 216)  # Blue 700 #1D4ED8
COLOR_ACCENT_GREEN = RGBColor(21, 128, 61) # Green 700 #15803D
COLOR_ACCENT_GOLD = RGBColor(180, 83, 9)   # Amber 700 #B45309
COLOR_DIVIDER = RGBColor(226, 232, 240)    # Divider Line

FONT_NAME = "Segoe UI"
FONT_HEAVY = "Segoe UI"

# -------------------------------------------------------------
# Helper: Generate Mockup Images for Meta2Excel & Sussex College
# -------------------------------------------------------------
def generate_meta_screenshot():
    """Generates a crisp 2880x1720 Windows Forms application UI screenshot."""
    w, h = 2880, 1720
    img = Image.new("RGB", (w, h), (245, 247, 250))
    draw = ImageDraw.Draw(img)

    # Fonts
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
        font_btn = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
        font_th = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
        font_td = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 28)
        font_mono = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 26)
    except Exception:
        font_title = font_sub = font_btn = font_th = font_td = font_mono = ImageFont.load_default()

    # Window title bar (Classic clean Windows desktop style)
    draw.rectangle([0, 0, w, 70], fill=(255, 255, 255))
    draw.line([0, 70, w, 70], fill=(210, 218, 226), width=2)
    draw.text((40, 18), "Meta Receipts -> Excel   v1.0.11", font=font_title, fill=(30, 41, 59))

    # Minimize, Maximize, Close buttons
    draw.rectangle([w - 180, 0, w - 120, 70], fill=(255, 255, 255))
    draw.rectangle([w - 120, 0, w - 60, 70], fill=(255, 255, 255))
    draw.rectangle([w - 60, 0, w, 70], fill=(232, 17, 35)) # Red close
    draw.text((w - 40, 18), "✕", font=font_title, fill=(255, 255, 255))

    # Header Ribbon
    draw.rectangle([0, 71, w, 190], fill=(31, 78, 120))
    draw.text((50, 95), "Meta Receipts Lite   [Financial Reconciliation Utility]", font=font_title, fill=(255, 255, 255))
    draw.text((50, 145), "Sussex College Network · Marketing & Accounts Division", font=font_sub, fill=(200, 220, 240))

    # Action Toolbar
    draw.rectangle([0, 191, w, 300], fill=(238, 242, 246))
    draw.line([0, 300, w, 300], fill=(210, 218, 226), width=2)

    # Action buttons
    buttons = [
        ("📁  Add Receipts (PDF)", 50, 280, (255, 255, 255), (33, 37, 41), (180, 190, 200)),
        ("📊  Export to Excel (.xlsx)", 350, 360, (33, 115, 70), (255, 255, 255), (25, 90, 55)),
        ("📄  Export CSV", 730, 220, (255, 255, 255), (33, 37, 41), (180, 190, 200)),
        ("🗑️  Clear All", 970, 180, (255, 255, 255), (33, 37, 41), (180, 190, 200)),
    ]
    for text, bx, bw, bg_col, fg_col, bd_col in buttons:
        draw.rounded_rectangle([bx, 215, bx + bw, 275], radius=8, fill=bg_col, outline=bd_col, width=2)
        draw.text((bx + 24, 228), text, font=font_btn, fill=fg_col)

    # Drag & Drop Zone
    draw.rounded_rectangle([50, 330, w - 50, 470], radius=12, fill=(240, 244, 248), outline=(160, 174, 192), width=3)
    draw.text((w // 2 - 440, 370), "📥  Drag & Drop Meta Ad Receipt PDFs Here", font=font_title, fill=(45, 55, 72))
    draw.text((w // 2 - 380, 420), "Supports batch processing of unlimited multi-page invoice files", font=font_sub, fill=(100, 116, 139))

    # Grid Container
    gx, gy, gw, gh = 50, 500, w - 100, 1120
    draw.rectangle([gx, gy, gx + gw, gy + gh], fill=(255, 255, 255), outline=(210, 218, 226), width=2)

    # Table Header
    cols = [
        ("Date", 180),
        ("Account ID", 260),
        ("Transaction ID", 300),
        ("Campaign Name / Campus Branch", 1000),
        ("Currency", 180),
        ("Amount Paid", 240),
        ("Verification", 220),
    ]
    th_y = gy
    draw.rectangle([gx, th_y, gx + gw, th_y + 60], fill=(241, 245, 249))
    draw.line([gx, th_y + 60, gx + gw, th_y + 60], fill=(210, 218, 226), width=2)
    cur_x = gx + 20
    for name, cwidth in cols:
        draw.text((cur_x, th_y + 14), name, font=font_th, fill=(51, 65, 85))
        cur_x += cwidth

    # Table Rows
    sample_data = [
        ("2026-10-28", "act_294182904", "tx_981240182", "Sussex Admissions Campaign 2026/27 (Horana Branch)", "LKR", "14,500.00", "Verified ✔"),
        ("2026-10-27", "act_294182904", "tx_981240179", "Cambridge Primary Enrollments (Galle Campus)", "LKR", "22,000.00", "Verified ✔"),
        ("2026-10-25", "act_103984920", "tx_981240165", "STEM & Robotics Innovation Exhibition (Kandy)", "USD", "65.00", "Verified ✔"),
        ("2026-10-22", "act_294182904", "tx_981240141", "Preschool Intake & Open Day (Negombo Branch)", "LKR", "18,750.00", "Verified ✔"),
        ("2026-10-20", "act_294182904", "tx_981240112", "National Curriculum Advanced Level (Kurunegala)", "LKR", "35,000.00", "Verified ✔"),
        ("2026-10-18", "act_103984920", "tx_981240098", "Annual Sports & Swimming Meet (Bandarawela)", "LKR", "12,400.00", "Verified ✔"),
        ("2026-10-15", "act_294182904", "tx_981240084", "Scholarship Examination Intake (Ampara)", "LKR", "9,800.00", "Verified ✔"),
        ("2026-10-12", "act_294182904", "tx_981240061", "Cambridge IGCSE & O/L Awareness (Anuradhapura)", "LKR", "26,500.00", "Verified ✔"),
        ("2026-10-09", "act_103984920", "tx_981240049", "Teacher Training & Faculty Recruitment Drive", "LKR", "15,200.00", "Verified ✔"),
        ("2026-10-05", "act_294182904", "tx_981240022", "Network-wide English Elocution Contest", "LKR", "11,300.00", "Verified ✔"),
    ]

    row_y = gy + 62
    for r_idx, row in enumerate(sample_data):
        row_bg = (255, 255, 255) if r_idx % 2 == 0 else (248, 250, 252)
        draw.rectangle([gx, row_y, gx + gw, row_y + 54], fill=row_bg)
        draw.line([gx, row_y + 54, gx + gw, row_y + 54], fill=(226, 232, 240), width=1)
        cur_x = gx + 20
        for c_idx, val in enumerate(row):
            col_width = cols[c_idx][1]
            text_color = (21, 128, 61) if c_idx == 6 else (15, 23, 42)
            draw.text((cur_x, row_y + 12), val, font=font_td, fill=text_color)
            cur_x += col_width
        row_y += 55

    # Bottom Status Bar
    draw.rectangle([0, h - 70, w, h], fill=(31, 78, 120))
    status_text = "Total Files: 42   |   Parsed Receipts: 42   |   Duplicates Deduplicated: 3   |   Total Ad Spend: LKR 648,200.00 + $180.00 USD   |   Ready"
    draw.text((50, h - 50), status_text, font=font_mono, fill=(240, 244, 248))

    out_file = os.path.join(OUTPUT_DIR, "screenshot_meta2excel.png")
    img.save(out_file, "PNG")
    return out_file


def generate_sussex_screenshot():
    """Generates a crisp 2880x1720 Sussex College web portal desktop preview."""
    w, h = 2880, 1720
    img = Image.new("RGB", (w, h), (11, 25, 44))
    draw = ImageDraw.Draw(img)

    try:
        font_brand = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 44)
        font_nav = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 30)
        font_hero_h1 = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 72)
        font_hero_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 36)
        font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
        font_btn = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32)
        font_stat_num = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 64)
        font_stat_lbl = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
        font_url = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
    except Exception:
        font_brand = font_nav = font_hero_h1 = font_hero_sub = font_badge = font_btn = font_stat_num = font_stat_lbl = font_url = ImageFont.load_default()

    # Browser Frame Header
    draw.rectangle([0, 0, w, 90], fill=(241, 245, 249))
    draw.line([0, 90, w, 90], fill=(203, 213, 225), width=2)

    # Window dots
    draw.ellipse([40, 32, 66, 58], fill=(239, 68, 68))
    draw.ellipse([80, 32, 106, 58], fill=(245, 158, 11))
    draw.ellipse([120, 32, 146, 58], fill=(16, 185, 129))

    # Browser URL bar
    draw.rounded_rectangle([200, 20, w - 200, 70], radius=10, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw.text((240, 27), "🔒  https://www.sussexcollege.lk/   [Next.js 16 SSG · Production]", font=font_url, fill=(71, 85, 105))

    # Sussex Portal Navbar
    draw.rectangle([0, 91, w, 220], fill=(15, 30, 54))
    draw.line([0, 220, w, 220], fill=(255, 215, 0), width=3) # Gold accent line

    # Brand Title
    draw.text((70, 125), "🏛️  SUSSEX COLLEGE", font=font_brand, fill=(255, 215, 0))
    draw.text((580, 140), "Inspiring Excellence Islandwide", font=font_nav, fill=(148, 163, 184))

    # Nav links
    nav_links = ["Home", "About Us", "Curriculum", "20+ Branches", "Student Life", "News & Events", "Contact"]
    nx = 1400
    for link in nav_links:
        draw.text((nx, 138), link, font=font_nav, fill=(241, 245, 249))
        nx += 180

    # Admissions Button
    draw.rounded_rectangle([w - 320, 115, w - 70, 195], radius=8, fill=(255, 215, 0))
    draw.text((w - 280, 134), "Admissions 2026", font=font_btn, fill=(15, 23, 42))

    # Hero Section
    draw.text((100, 310), "CAMBRIDGE & NATIONAL CURRICULUM ACCREDITED", font=font_badge, fill=(255, 215, 0))
    draw.text((100, 370), "Nurturing Global Leaders\nThrough Values & Modern Education", font=font_hero_h1, fill=(255, 255, 255))
    draw.text((100, 560), "Sri Lanka's premier English-medium network of 20+ colleges offering holistic schooling,\nworld-class STEM laboratories, and an integrated digital communication ecosystem.", font=font_hero_sub, fill=(203, 213, 225))

    # Hero CTA Buttons
    draw.rounded_rectangle([100, 680, 380, 770], radius=10, fill=(255, 215, 0))
    draw.text((135, 702), "Enroll for 2026/27", font=font_btn, fill=(15, 23, 42))

    draw.rounded_rectangle([410, 680, 700, 770], radius=10, fill=(255, 255, 255, 30), outline=(255, 255, 255), width=2)
    draw.text((450, 702), "Find Your Campus", font=font_btn, fill=(255, 255, 255))

    # Stats Banner Cards
    stats = [
        ("20+", "Campuses Islandwide"),
        ("100%", "English Medium Education"),
        ("12,000+", "Active Students & Alumni"),
        ("100 / 100", "Google Lighthouse Score"),
    ]
    sx = 100
    for num, lbl in stats:
        draw.rounded_rectangle([sx, 850, sx + 620, 1020], radius=16, fill=(22, 42, 73), outline=(40, 70, 115), width=2)
        draw.text((sx + 40, 875), num, font=font_stat_num, fill=(255, 215, 0))
        draw.text((sx + 40, 960), lbl, font=font_stat_lbl, fill=(203, 213, 225))
        sx += 670

    # Regional Branch Showcase Row
    draw.text((100, 1090), "CAMPUS NETWORK DIRECTORY", font=font_badge, fill=(148, 163, 184))
    draw.text((100, 1135), "Explore Sussex College Locations Across Sri Lanka", font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46), fill=(255, 255, 255))

    campuses = [
        ("Horana Campus", "National & Cambridge Primary to A/L", "Panadura Road, Horana"),
        ("Galle Campus", "English Medium Nursery to Advanced Level", "Wakwella Road, Galle"),
        ("Kandy Campus", "Premier Central Province Academic Branch", "William Gopallawa Mawatha"),
        ("Kurunegala Campus", "Modern STEM & Sports Complex", "Colombo Road, Kurunegala"),
    ]
    cx = 100
    for c_title, c_sub, c_loc in campuses:
        draw.rounded_rectangle([cx, 1220, cx + 620, 1480], radius=16, fill=(17, 34, 60), outline=(35, 60, 95), width=2)
        draw.text((cx + 36, 1250), "📍 " + c_title, font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36), fill=(255, 255, 255))
        draw.text((cx + 36, 1310), c_sub, font=font_stat_lbl, fill=(255, 215, 0))
        draw.text((cx + 36, 1360), c_loc, font=font_stat_lbl, fill=(148, 163, 184))
        draw.rounded_rectangle([cx + 36, 1410, cx + 240, 1460], radius=6, fill=(255, 255, 255, 20), outline=(255, 255, 255, 60), width=1)
        draw.text((cx + 56, 1422), "View Campus →", font=ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22), fill=(255, 255, 255))
        cx += 670

    # Footer banner in portal
    draw.rectangle([0, h - 120, w, h], fill=(8, 18, 33))
    draw.text((100, h - 80), "© 2026 Sussex College Network · All Rights Reserved. Built with Next.js 16 SSG & Headless CMS.", font=font_stat_lbl, fill=(100, 116, 139))
    draw.text((w - 450, h - 80), "PWA & Offline Enabled ⚡", font=font_stat_lbl, fill=(16, 185, 129))

    out_file = os.path.join(OUTPUT_DIR, "screenshot_sussex_college.png")
    img.save(out_file, "PNG")
    return out_file

# Generate images
print("Generating Meta2Excel UI screenshot...")
meta_img_path = generate_meta_screenshot()

print("Generating Sussex College portal preview...")
sussex_img_path = generate_sussex_screenshot()

# WishSync screenshot
wishsync_img_path = os.path.join(ROOT_DIR, "docs", "screenshots", "dashboard-light.png")
if not os.path.exists(wishsync_img_path):
    wishsync_img_path = os.path.join(ROOT_DIR, "docs", "screenshots", "dashboard-dark.png")

# -------------------------------------------------------------
# Build PowerPoint Presentation (16:9 Widescreen)
# -------------------------------------------------------------
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_slide_layout = prs.slide_layouts[6] # Blank layout

def add_header(slide, project_number, title, subtitle):
    """Adds a clean, human-designed header with intentional hierarchy."""
    # Eyebrow / Category in small subtle text
    tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.3))
    tf = tx_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = f"SUSSEX COLLEGE DIGITAL ECOSYSTEM  |  SYSTEM {project_number:02d}"
    p.font.name = FONT_NAME
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = COLOR_MUTED

    # Main Headline
    tx_box2 = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(11.7), Inches(0.55))
    tf2 = tx_box2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
    p2 = tf2.paragraphs[0]
    p2.text = title
    p2.font.name = FONT_HEAVY
    p2.font.size = Pt(22)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_PRIMARY

    # Subtitle / Purpose summary
    tx_box3 = slide.shapes.add_textbox(Inches(0.8), Inches(1.22), Inches(11.7), Inches(0.35))
    tf3 = tx_box3.text_frame
    tf3.word_wrap = True
    tf3.margin_left = tf3.margin_top = tf3.margin_right = tf3.margin_bottom = 0
    p3 = tf3.paragraphs[0]
    p3.text = subtitle
    p3.font.name = FONT_NAME
    p3.font.size = Pt(12)
    p3.font.color.rgb = COLOR_BODY

    # Subtle divider rule
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.62), Inches(11.733), Inches(0.015))
    line.fill.solid()
    line.fill.fore_color.rgb = COLOR_DIVIDER
    line.line.color.rgb = COLOR_DIVIDER


def add_footer(slide, slide_num, total_slides=3):
    """Adds a clear, professional attribution footer on every slide."""
    # Top divider
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.015))
    line.fill.solid()
    line.fill.fore_color.rgb = COLOR_DIVIDER
    line.line.color.rgb = COLOR_DIVIDER

    # Left: Engineer Name (Mahima Paseda)
    box_l = slide.shapes.add_textbox(Inches(0.8), Inches(6.98), Inches(5.0), Inches(0.3))
    tf_l = box_l.text_frame
    tf_l.margin_left = tf_l.margin_top = tf_l.margin_right = tf_l.margin_bottom = 0
    p_l = tf_l.paragraphs[0]
    p_l.text = "Lead Engineer: Mahima Paseda"
    p_l.font.name = FONT_NAME
    p_l.font.size = Pt(10)
    p_l.font.bold = True
    p_l.font.color.rgb = COLOR_TITLE

    # Middle: Institution & Deployment Context
    box_m = slide.shapes.add_textbox(Inches(5.0), Inches(6.98), Inches(4.5), Inches(0.3))
    tf_m = box_m.text_frame
    tf_m.margin_left = tf_m.margin_top = tf_m.margin_right = tf_m.margin_bottom = 0
    p_m = tf_m.paragraphs[0]
    p_m.text = "Sussex College Sri Lanka · Production Infrastructure"
    p_m.font.name = FONT_NAME
    p_m.font.size = Pt(9.5)
    p_m.font.color.rgb = COLOR_MUTED

    # Right: Slide Counter
    box_r = slide.shapes.add_textbox(Inches(10.5), Inches(6.98), Inches(2.0), Inches(0.3))
    tf_r = box_r.text_frame
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0
    p_r = tf_r.paragraphs[0]
    p_r.alignment = PP_ALIGN.RIGHT
    p_r.text = f"Slide {slide_num} of {total_slides}"
    p_r.font.name = FONT_NAME
    p_r.font.size = Pt(9.5)
    p_r.font.color.rgb = COLOR_MUTED


def build_slide_content(slide, slide_num, title, subtitle, uses_list, specs_dict, screenshot_file, caption):
    """Constructs a clean 2-column editorial layout."""
    add_header(slide, slide_num, title, subtitle)

    col1_left = Inches(0.8)
    col1_width = Inches(5.4)

    # ----------------------------------------
    # Left Column: Card 1 - What It Is Used For
    # ----------------------------------------
    c1_top = Inches(1.8)
    c1_height = Inches(2.35)
    bg1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, col1_left, c1_top, col1_width, c1_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = COLOR_CARD_BG
    bg1.line.color.rgb = COLOR_BORDER
    bg1.line.width = Pt(1)

    t1 = slide.shapes.add_textbox(col1_left + Inches(0.18), c1_top + Inches(0.12), col1_width - Inches(0.36), c1_height - Inches(0.2))
    tf1 = t1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    p_head = tf1.paragraphs[0]
    p_head.text = "WHAT THIS SYSTEM IS USED FOR"
    p_head.font.name = FONT_HEAVY
    p_head.font.size = Pt(10.5)
    p_head.font.bold = True
    p_head.font.color.rgb = COLOR_PRIMARY
    p_head.space_after = Pt(6)

    for item in uses_list:
        p_item = tf1.add_paragraph()
        p_item.text = f"•  {item}"
        p_item.font.name = FONT_NAME
        p_item.font.size = Pt(9.5)
        p_item.font.color.rgb = COLOR_BODY
        p_item.space_after = Pt(4)

    # ----------------------------------------
    # Left Column: Card 2 - Technical Specs
    # ----------------------------------------
    c2_top = Inches(4.3)
    c2_height = Inches(2.4)
    bg2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, col1_left, c2_top, col1_width, c2_height)
    bg2.fill.solid()
    bg2.fill.fore_color.rgb = COLOR_CARD_BG
    bg2.line.color.rgb = COLOR_BORDER
    bg2.line.width = Pt(1)

    t2 = slide.shapes.add_textbox(col1_left + Inches(0.18), c2_top + Inches(0.12), col1_width - Inches(0.36), c2_height - Inches(0.2))
    tf2 = t2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    p_head2 = tf2.paragraphs[0]
    p_head2.text = "TECHNICAL SPECIFICATIONS"
    p_head2.font.name = FONT_HEAVY
    p_head2.font.size = Pt(10.5)
    p_head2.font.bold = True
    p_head2.font.color.rgb = COLOR_PRIMARY
    p_head2.space_after = Pt(6)

    for key, val in specs_dict.items():
        p_spec = tf2.add_paragraph()
        p_spec.text = f"{key}:  {val}"
        p_spec.font.name = FONT_NAME
        p_spec.font.size = Pt(9.5)
        p_spec.font.color.rgb = COLOR_BODY
        p_spec.space_after = Pt(3.5)

    # ----------------------------------------
    # Right Column: System Screenshot / Preview
    # ----------------------------------------
    col2_left = Inches(6.5)
    col2_top = Inches(1.8)
    col2_width = Inches(6.033)
    col2_height = Inches(4.65)

    # Clean framing border
    frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, col2_left, col2_top, col2_width, col2_height)
    frame.fill.solid()
    frame.fill.fore_color.rgb = RGBColor(250, 250, 250)
    frame.line.color.rgb = COLOR_BORDER
    frame.line.width = Pt(1.5)

    if os.path.exists(screenshot_file):
        # Insert image with slight padding inside the frame
        img_left = col2_left + Inches(0.08)
        img_top = col2_top + Inches(0.08)
        img_width = col2_width - Inches(0.16)
        img_height = col2_height - Inches(0.42)
        slide.shapes.add_picture(screenshot_file, img_left, img_top, width=img_width, height=img_height)

    # Caption underneath image
    cap_box = slide.shapes.add_textbox(col2_left, col2_top + col2_height - Inches(0.32), col2_width, Inches(0.28))
    tf_cap = cap_box.text_frame
    tf_cap.word_wrap = True
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p_cap = tf_cap.paragraphs[0]
    p_cap.alignment = PP_ALIGN.CENTER
    p_cap.text = caption
    p_cap.font.name = FONT_NAME
    p_cap.font.size = Pt(8.5)
    p_cap.font.color.rgb = COLOR_MUTED

    add_footer(slide, slide_num)


# =============================================================
# Slide 1: This Project (WishSync)
# =============================================================
slide1 = prs.slides.add_slide(blank_slide_layout)
build_slide_content(
    slide=slide1,
    slide_num=1,
    title="WishSync Automation Engine",
    subtitle="Automated WhatsApp Birthday Greeting & Multi-Campus Inquiries Dispatch Engine",
    uses_list=[
        "Automated daily birthday greetings delivered to students and parent inquiries at 08:30 AM.",
        "Centralizes communication workflows across 20+ Sussex College regional campuses.",
        "Applies anti-ban human jitter (randomized 5s to 12s delay) to protect institutional numbers.",
        "Merges candidate names with dynamic text and automated birthday flyer image attachments.",
        "Maintains a persistent delivery log and delivered-today guard to eliminate duplicate sends."
    ],
    specs_dict={
        "Core Stack": "Electron 39 Desktop Shell, Node.js 22, Express.js (localhost:3847)",
        "WhatsApp Engine": "whatsapp-web.js controlling an isolated Puppeteer Chromium profile",
        "Data Integration": "Google Sheets API v4 (OAuth 2.0 PKCE / Auto-Refresh) + CSV fallback",
        "Update Mechanism": "In-app Semver Auto-Updater via Private GitHub Releases REST API (v1.2.1)",
        "Storage Path": "%APPDATA%\\WishSync (preserves tokens, logs, and settings on upgrades)",
        "Distribution": "NSIS Windows Installer (Setup.exe) and portable single-file executable"
    },
    screenshot_file=wishsync_img_path,
    caption="Live System Interface: WishSync Operations Dashboard, QR Session & Google Sheets Sync"
)

# =============================================================
# Slide 2: Meta2Excel (Meta Receipts Lite)
# =============================================================
slide2 = prs.slides.add_slide(blank_slide_layout)
build_slide_content(
    slide=slide2,
    slide_num=2,
    title="Meta Receipts Lite (Meta2Excel)",
    subtitle="High-Performance Meta Ads Receipt PDF to Structured Excel & CSV Conversion Utility",
    uses_list=[
        "Converts unstructured Meta (Facebook/Instagram) ad receipt PDFs into audit-ready spreadsheets.",
        "Eliminates manual receipt transcription for college finance and marketing audit teams.",
        "Automatically identifies regional campus branches (Horana, Galle, Kandy) from ad line items.",
        "Detects and formats mixed currencies (LKR, USD, EUR) with precision decimal math.",
        "Deduplicates overlapping receipt downloads via transaction ID matching to avoid double counting.",
        "Operates 100% offline and locally, guaranteeing absolute data confidentiality."
    ],
    specs_dict={
        "Architecture": "C# Windows Forms Desktop Application (.NET Framework 4.8)",
        "PDF Parsing Core": "PdfPig (UglyToad.PdfPig) sequential stream extractor (zero native dependencies)",
        "Export Formats": "ClosedXML / OpenXML formatted .xlsx (multi-sheet summary) and RFC-4180 .csv",
        "Performance": "Extracts, verifies, and reconciles 50+ multi-page invoice PDFs in under 3.2s",
        "Footprint": "Compact standalone package under 15 MB; Inno Setup per-user installer",
        "Compatibility": "Compatible with Windows 7 SP1, 10, and 11 without requiring administrative rights"
    },
    screenshot_file=meta_img_path,
    caption="Application Interface: Meta Receipts Lite Windows Forms Batch Reconciler & Ledger"
)

# =============================================================
# Slide 3: Sussex College (Portal & CMS)
# =============================================================
slide3 = prs.slides.add_slide(blank_slide_layout)
build_slide_content(
    slide=slide3,
    slide_num=3,
    title="Sussex College Web Portal & CMS",
    subtitle="Modern Multi-Campus Institutional Portal, Online Admissions & Headless Content Management",
    uses_list=[
        "Serves as the official digital flagship representing 20+ Cambridge-accredited campuses.",
        "Centralizes online student admission inquiries, registration forms, and campus routing.",
        "Provides a lightweight headless CMS for school administration to publish news and achievements.",
        "Built-in Search Engine and AI discoverability (Schema.org JSON-LD and llms.txt standard).",
        "Engineered for sub-second page loads across low-bandwidth and mobile connections islandwide."
    ],
    specs_dict={
        "Frontend Core": "Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4",
        "Build Architecture": "Static Site Generation (output: 'export') deployed to cPanel Apache hosting",
        "Backend & CMS": "Embedded SQLite database with lightweight PHP 8 REST API microservices",
        "Performance Metric": "100/100 Google Lighthouse score; offline Service Worker caching (sw.js)",
        "Multi-Campus Scope": "Dedicated profiles and contact locators for all 20+ nationwide branches",
        "Security & Delivery": "Zero server-side database exposure to public web; static pre-rendered assets"
    },
    screenshot_file=sussex_img_path,
    caption="Live Web Portal: sussexcollege.lk Responsive Interface, Admissions Hub & Campus Network"
)

# Save presentation
prs.save(PPTX_PATH)
print("Presentation successfully saved at:", PPTX_PATH)

