const DEHU = "https://dehu.redsara.es/";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.startsWith(DEHU)) {
    chrome.tabs.sendMessage(tab.id, { type: "toggle-overlay" });
  } else {
    await chrome.tabs.create({ url: "https://dehu.redsara.es/es/home-view" });
  }
});
