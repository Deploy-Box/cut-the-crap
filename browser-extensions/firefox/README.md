# Cut The Crap for Firefox

Click the extension button on a recipe page to open Cut The Crap and extract
the recipe from that page.

## Install for development

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on…**.
3. Choose `manifest.json` from this `firefox` directory.
4. Click the extension button while viewing a recipe page.

Temporary add-ons are removed when Firefox closes. The extension only reads
the active tab's URL after you click it. It opens the Cut The Crap result page
with that URL; browser-internal pages and other non-HTTP(S) pages are ignored.
