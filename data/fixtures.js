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

  // 近期战果（新的放在最前面）
  results: [
    { date: "2025.04.19", home: "今日说法", away: "东吴FC",     score: "3:2", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"张浩宇",num:9},{name:"古培杰",num:14}],
      assisters: [{name:"向润杰",num:10},{name:"刘畅",num:7}] },
    { date: "2025.04.12", home: "今日说法", away: "快乐足球",   score: "2:1", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"刘畅",num:7}],
      assisters: [{name:"张浩宇",num:9}] },
    { date: "2025.04.05", home: "铁狼队",   away: "今日说法", score: "0:1", result: "win",
      scorers: [{name:"向润杰",num:10}],
      assisters: [{name:"李泽",num:22}] },
    { date: "2025.03.29", home: "今日说法", away: "蓝月亮",     score: "3:1", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"张浩宇",num:9},{name:"刘畅",num:7}],
      assisters: [{name:"李泽",num:22},{name:"张浩宇",num:9}] },
    { date: "2025.03.22", home: "东风FC",   away: "今日说法", score: "1:1", result: "draw",
      scorers: [{name:"张浩宇",num:9}],
      assisters: [{name:"向润杰",num:10}] },
    { date: "2025.03.15", home: "今日说法", away: "老男孩FC",   score: "4:2", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"李泽",num:22},{name:"张浩宇",num:9},{name:"唐文",num:18}],
      assisters: [{name:"刘畅",num:7},{name:"向润杰",num:10}] },
    { date: "2025.03.08", home: "飓风青年", away: "今日说法", score: "2:0", result: "loss",
      scorers: [],
      assisters: [] },
    { date: "2025.03.01", home: "今日说法", away: "雄狮联盟",   score: "5:3", result: "win",
      scorers: [{name:"向润杰",num:10},{name:"向润杰",num:10},{name:"张浩宇",num:9},{name:"刘畅",num:7},{name:"唐文",num:18}],
      assisters: [{name:"张浩宇",num:9},{name:"李泽",num:22},{name:"向润杰",num:10}] },
  ],

  // 即将开赛
  upcoming: [
    { date: "2026.05.23", time: "14:40", home: "今日说法", away: "重庆龮枥", venue: "奥体驰骋足球场2号场", jersey: "蓝", jerseyColor: "#4a90d9" },
    { date: "2026.05.24", time: "19:00", home: "飞虎",     away: "今日说法", venue: "华侨城足球公园",     jersey: "粉", jerseyColor: "#f0a0b0" },
  ],

};
