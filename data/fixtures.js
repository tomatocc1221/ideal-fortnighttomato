// ============================================================
// 赛程数据 — 修改比赛记录和即将开赛都在这里，无需改动 main.js
// ============================================================
// 格式说明：
//   date    — 日期，格式 "YYYY.MM.DD"
//   time    — 开球时间（仅 upcoming 需要）
//   home    — 主队
//   away    — 客队
//   score   — 比分（仅 results 需要）
//   result  — 战果：win=胜 / draw=平 / loss=负
//   scorers — 进球者 [{name:"姓名", num:号码}]，无进球填 []
//   assisters — 助攻者 [{name:"姓名", num:号码}]，无助攻填 []
//   venue   — 场地（仅 upcoming 需要）
//   jersey  — 球衣颜色（仅 upcoming 需要，蓝/粉）
//   jerseyColor — 球衣色值（仅 upcoming 需要）
// ============================================================

window.__fixturesData = {

  // 近期战果（从 API 动态加载）
  results: [],

  // 即将开赛
  upcoming: [],

};
