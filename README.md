# Wien Bələdçi

Vyana səfəri (17–20 noyabr 2026) üçün mobil veb tətbiq — Fidan, Sədaqət, Kəmalə üçün.

**Açmaq:** Kənanın göndərdiyi linki Safari-də aç → Paylaş ⬆︎ → “Ana ekrana əlavə et”.

## Nə var
- 📷 Kamera ilə yeri tanıma və tarixini Azərbaycan dilində danışma
- 🛍 Məhsul şəkli → Vyana, Bakı və Türkiyə qiyməti (internetdə canlı axtarış)
- 🗣 Tərcümə: hazır ifadələr (səhvə dözümlü axtarış), sərbəst tərcümə, almanca səsli dinləmə
- 🗺 Real xəritə, GPS, piyada marşrut, yol boyunca nə var
- 💶 Ortaq xərclər: kim ödədi, kimlər üçün, balans və hesablaşma
- 🗓 Gün-gün plan, otel, hava, xəbərdarlıqlar, € ⇄ ₼ ⇄ ₺

## Quruluş
- `index.html`, `app.js`, `data.js` — statik sayt (GitHub Pages)
- `sw.js`, `manifest.webmanifest`, `icons/` — ana ekran tətbiqi və oflayn rejim
- `supabase/api/index.ts` — Supabase Edge Function: ortaq məlumat və Claude API (açar serverdə gizlidir, giriş səyahət kodu ilə)

Giriş kodu repoda saxlanmır, yalnız paylaşılan linkdədir.
