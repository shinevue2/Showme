/** Contact micro-strings (DESIGN §6.10). Owner: WP-10. */
import type { Lang } from '../../core/types';

export interface ContactStrings {
  details: string; email: string; links: string; location: string; reply: string; auth: string; where: string;
  subject: string; required: string; badEmail: string; sealGuide: string; sealed: string; seal: string;
}

export const strings: Readonly<Record<Lang, ContactStrings>> = {
  ja: {
    details: '連絡先', email: 'メール', links: 'リンク', location: '東京', reply: '返信', auth: '就労資格', where: '勤務地',
    subject: 'お問い合わせ（八度摺より）', required: 'この欄をご記入ください', badEmail: 'メールアドレスの形式をご確認ください',
    sealGuide: '押印', sealed: '落款を押しました', seal: '落款「湊」',
  },
  en: {
    details: 'Details', email: 'Email', links: 'Links', location: 'Tokyo', reply: 'Replies', auth: 'Work authorization', where: 'Location',
    subject: 'Hello from Eight Impressions', required: 'Please fill in this field', badEmail: 'Please check the email address',
    sealGuide: 'seal', sealed: 'Sealed', seal: 'Seal: Minato',
  },
  zh: {
    details: '联系方式', email: '电子邮件', links: '链接', location: '东京', reply: '回复', auth: '工作许可', where: '工作地点',
    subject: '来自八版套印的联系', required: '请填写此项', badEmail: '请检查电子邮箱格式',
    sealGuide: '钤印', sealed: '已钤印', seal: '印章「凑」',
  },
};

/** Glyphs the letter face must carry (Klee One / Long Cang subsets; content strings are read by the font script too). */
export const display: Partial<Record<Lang, string>> = {
  ja: '2027年1月から、シニアまたはスタッフエンジニアとして新しい仕事をお引き受けできます。分散システム、開発者基盤、Webの描画性能にかかわる課題でしたら、規模を問わずお聞かせください。お返事は、1営業日以内にいたします。瀬川湊京師三条大橋江戸より百二十六里着押印',
  zh: '2027年1月起，我可以承担新的高级或资深（Staff）工程师工作。如果您的课题与分布式系统、开发者平台或渲染性能有关，无论规模大小，都欢迎来信。我会在1个工作日内回复。濑川凑京师三条大桥自江户一百二十六里抵达钤印',
};
