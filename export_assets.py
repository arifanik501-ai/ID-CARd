import base64

with open('template_front.jpg', 'rb') as f:
    front_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('template_back.jpg', 'rb') as f:
    back_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('extracted_qr_code.png', 'rb') as f:
    qr_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('extracted_auth_signature.png', 'rb') as f:
    auth_sig_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('ring_overlay.png', 'rb') as f:
    ring_overlay_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('templates_data.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated assets as base64 for seamless offline execution without CORS issues\n')
    f.write(f'const TEMPLATE_FRONT_B64 = "data:image/jpeg;base64,{front_b64}";\n')
    f.write(f'const TEMPLATE_BACK_B64 = "data:image/jpeg;base64,{back_b64}";\n')
    f.write(f'const QR_CODE_B64 = "data:image/png;base64,{qr_b64}";\n')
    f.write(f'const AUTH_SIG_B64 = "data:image/png;base64,{auth_sig_b64}";\n')
    f.write(f'const RING_OVERLAY_B64 = "data:image/png;base64,{ring_overlay_b64}";\n')

print('templates_data.js successfully generated!')
