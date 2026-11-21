// 后台：定期检查更新，有新版本时在工具栏图标上显示 NEW 角标。
importScripts('update.js');

const ALARM = 'np-update-check';

function check() {
  npCheckForUpdate().catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: 360 });
  // 刚安装 / 刚更新完：强制刷新一次，清掉旧角标
  npCheckForUpdate({ force: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(check);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) check();
});
