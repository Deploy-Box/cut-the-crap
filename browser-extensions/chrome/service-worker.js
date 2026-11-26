chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return;

  const sourceUrl = new URL(tab.url);
  if (!["http:", "https:"].includes(sourceUrl.protocol)) return;

  const destination = new URL("https://ctc.deploy-box.com/result/");
  destination.searchParams.set("url", sourceUrl.href);
  chrome.tabs.create({ url: destination.href });
});
