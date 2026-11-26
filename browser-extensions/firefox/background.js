browser.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;

  const sourceUrl = new URL(tab.url);
  if (!["http:", "https:"].includes(sourceUrl.protocol)) return;

  const destination = new URL("https://ctc.deploy-box.com/result/");
  destination.searchParams.set("url", sourceUrl.href);

  try {
    await browser.tabs.create({ url: destination.href });
  } catch (error) {
    console.error("Could not open Cut The Crap.", error);
  }
});
