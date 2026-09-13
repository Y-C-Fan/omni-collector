import { Notice, PluginSettingTab, Setting } from "obsidian";
import type FavCollectorPlugin from "./main.js";

export class FavSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: FavCollectorPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    containerEl.createEl("h3", { text: "登录态（只存本机 data.json，不上传）" });

    new Setting(containerEl)
      .setName("B站 Cookie")
      .setDesc("SESSDATA 粘贴 \"k=v; k2=v2\" 格式（Cookie-Editor 导出）")
      .addTextArea((t) =>
        t.setValue(s.biliCookies).onChange(async (v) => {
          s.biliCookies = v.trim();
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("X Cookie")
      .setDesc("auth_token + ct0，\"k=v; k2=v2\" 格式（和周报同一套）")
      .addTextArea((t) =>
        t.setValue(s.xCookies).onChange(async (v) => {
          s.xCookies = v.trim();
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("知乎 Access Secret")
      .setDesc("developer.zhihu.com/profile 生成")
      .addText((t) =>
        t.setValue(s.zhihuSecret).onChange(async (v) => {
          s.zhihuSecret = v.trim();
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl).setName("yt-dlp 路径").addText((t) =>
      t.setValue(s.ytdlpPath).onChange(async (v) => {
        s.ytdlpPath = v.trim();
        await this.plugin.saveSettings();
      }),
    );
    new Setting(containerEl)
      .setName("YouTube Cookie 文件（可选）")
      .setDesc("留空则走 Firefox 专用钥匙扣，免维护")
      .addText((t) =>
        t.setValue(s.ytCookieFile).onChange(async (v) => {
          s.ytCookieFile = v.trim();
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("小宇宙 access_token")
      .setDesc("网页版扫码登录后从请求头拷（refresh_token 一起粘，过期自动续）;同步收听历史，按播客归档")
      .addText((t) =>
        t.setValue(s.xyzAccessToken).onChange(async (v) => {
          s.xyzAccessToken = v.trim();
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl).setName("小宇宙 refresh_token（可选）").addText((t) =>
      t.setValue(s.xyzRefreshToken).onChange(async (v) => {
        s.xyzRefreshToken = v.trim();
        await this.plugin.saveSettings();
      }),
    );

    containerEl.createEl("h3", { text: "连通性测试" });
    for (const p of ["bilibili", "youtube", "zhihu", "x", "github", "xiaoyuzhou"] as const) {
      new Setting(containerEl)
        .setName(`测试 ${p}`)
        .addButton((b) =>
          b.setButtonText("测试").onClick(async () => {
            new Notice(`测试 ${p} 中…`);
            const r = await this.plugin.testPlatform(p);
            new Notice(r.ok ? `${p} OK（${r.items.length} 条）` : `${p} 失败：${r.error}`);
          }),
        );
    }
  }
}
