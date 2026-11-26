# Cut The Crap for Microsoft Edge

Click the extension button on a recipe page to open Cut The Crap and extract
the recipe from that page.

## Install for development

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this `edge` directory.
4. Pin the extension, then click it while viewing a recipe page.

The extension only reads the active tab's URL after you click it. It opens the
Cut The Crap result page with that URL; browser-internal pages and other
non-HTTP(S) pages are ignored.
