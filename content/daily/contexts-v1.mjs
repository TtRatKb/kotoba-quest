/* Original, AI-authored project sentences. No imported/Tatoeba material.
 * Linguistic self-review, not an independent native-speaker certification.
 * Version 1 is an additive display collection, never a vocabulary migration.
 */
const rows = [
 ['kc2k-0646','水','みず','Wasser','暑い日は、水をたくさん飲みます。','An heißen Tagen trinke ich viel Wasser.',{暑い:'あつい',日:'ひ',水:'みず',飲みます:'のみます'}],
 ['kc2k-0201','本','ほん','Buch','寝る前に、本を少し読みます。','Vor dem Schlafengehen lese ich ein wenig in einem Buch.',{寝る:'ねる',前:'まえ',本:'ほん',少し:'すこし',読みます:'よみます'}],
 ['kc2k-0189','学校','がっこう','Schule','学校の近くに、小さな公園があります。','In der Nähe der Schule gibt es einen kleinen Park.',{学校:'がっこう',近く:'ちかく',小さな:'ちいさな',公園:'こうえん'}],
 ['kc2k-0437','駅','えき','Bahnhof','駅で友達を待っています。','Ich warte am Bahnhof auf einen Freund.',{駅:'えき',友達:'ともだち',待っています:'まっています'}],
 ['kc2k-0442','電車','でんしゃ','Zug','この電車は、次の駅で止まります。','Dieser Zug hält am nächsten Bahnhof.',{電車:'でんしゃ',次:'つぎ',駅:'えき',止まります:'とまります'}],
 ['kc2k-0468','家','いえ','Zuhause','今日は、家でゆっくり休みます。','Heute ruhe ich mich zu Hause in aller Ruhe aus.',{今日:'きょう',家:'いえ',休みます:'やすみます'}],
 ['kc2k-0014','友達','ともだち','Freund','週末は、友達と映画を見ます。','Am Wochenende schaue ich mit einem Freund einen Film an.',{週末:'しゅうまつ',友達:'ともだち',映画:'えいが',見ます:'みます'}],
 ['kc2k-0048','先生','せんせい','Lehrer','分からない言葉を先生に聞きました。','Ich habe den Lehrer nach einem Wort gefragt, das ich nicht verstand.',{分からない:'わからない',言葉:'ことば',先生:'せんせい',聞きました:'ききました'}],
 ['kc2k-0049','学生','がくせい','Student','弟は大学の学生です。','Mein jüngerer Bruder ist Student an einer Universität.',{弟:'おとうと',大学:'だいがく',学生:'がくせい'}],
 ['kc2k-0224','仕事','しごと','Arbeit','仕事が終わったら、一緒にご飯を食べましょう。','Lass uns zusammen essen, wenn die Arbeit vorbei ist.',{仕事:'しごと',終わったら:'おわったら',一緒:'いっしょ',ご飯:'ごはん',食べましょう:'たべましょう'}],
 ['kc2k-0834','時間','じかん','Zeit','出発まで、まだ時間があります。','Bis zur Abfahrt ist noch Zeit.',{出発:'しゅっぱつ',時間:'じかん'}],
 ['kc2k-0815','今日','きょう','heute','今日は、いつもより早く帰ります。','Heute gehe ich früher als sonst nach Hause.',{今日:'きょう',早く:'はやく',帰ります:'かえります'}],
 ['kc2k-0817','明日','あした','morgen','明日は何時に会いましょうか。','Um wie viel Uhr wollen wir uns morgen treffen?',{明日:'あした',何時:'なんじ',会いましょう:'あいましょう'}],
 ['kc2k-0816','昨日','きのう','gestern','昨日は、家で映画を見ました。','Gestern habe ich zu Hause einen Film angeschaut.',{昨日:'きのう',家:'いえ',映画:'えいが',見ました:'みました'}],
 ['kc2k-0830','毎日','まいにち','jeden Tag','毎日、少しずつ日本語を練習しています。','Ich übe jeden Tag ein bisschen Japanisch.',{毎日:'まいにち',少し:'すこし',日本語:'にほんご',練習:'れんしゅう'}],
 ['kc2k-0806','朝','あさ','Morgen','朝は、温かいお茶を飲みます。','Morgens trinke ich warmen Tee.',{朝:'あさ',温かい:'あたたかい',お茶:'おちゃ',飲みます:'のみます'}],
 ['kc2k-0809','夜','よる','Abend','夜は、静かな音楽を聞きながら本を読みます。','Abends lese ich ein Buch und höre dabei ruhige Musik.',{夜:'よる',静かな:'しずかな',音楽:'おんがく',聞きながら:'ききながら',本:'ほん',読みます:'よみます'}],
 ['kc2k-0084','名前','なまえ','Name','ここに名前を書いてください。','Schreiben Sie bitte hier Ihren Namen hin.',{名前:'なまえ',書いて:'かいて'}],
 ['kc2k-0087','年齢','ねんれい','Alter','この教室では、年齢に関係なく一緒に学べます。','In diesem Kurs kann man unabhängig vom Alter gemeinsam lernen.',{教室:'きょうしつ',年齢:'ねんれい',関係:'かんけい',一緒:'いっしょ',学べます:'まなべます'}],
 ['kc2k-1230','電話','でんわ','Telefon','今、電話に出てもいいですか。','Darf ich jetzt ans Telefon gehen?',{今:'いま',電話:'でんわ',出ても:'でても'}],
 ['kc2k-1119','写真','しゃしん','Foto','旅行で撮った写真を友達に見せました。','Ich habe einem Freund die Fotos gezeigt, die ich auf der Reise gemacht habe.',{旅行:'りょこう',撮った:'とった',写真:'しゃしん',友達:'ともだち',見せました:'みせました'}],
 ['kc2k-0775','手紙','てがみ','Brief','祖母から手紙が届きました。','Ich habe einen Brief von meiner Großmutter bekommen.',{祖母:'そぼ',手紙:'てがみ',届きました:'とどきました'}],
 ['kc2k-0292','店','みせ','Laden','駅の前の店で、パンを買いました。','Ich habe in dem Laden vor dem Bahnhof Brot gekauft.',{駅:'えき',前:'まえ',店:'みせ',買いました:'かいました'}],
 ['kc2k-0467','部屋','へや','Zimmer','この部屋は、朝になると明るくなります。','Dieses Zimmer wird morgens hell.',{部屋:'へや',朝:'あさ',明るく:'あかるく'}],
 ['kc2k-0210','机','つくえ','Schreibtisch','机の上に、鍵を置いておきました。','Ich habe den Schlüssel auf den Schreibtisch gelegt, damit er dort bereitliegt.',{机:'つくえ',上:'うえ',鍵:'かぎ',置いて:'おいて'}],
 ['kc2k-0993','猫','ねこ','Katze','猫が窓のそばで寝ています。','Die Katze schläft am Fenster.',{猫:'ねこ',窓:'まど',寝ています:'ねています'}],
 ['kc2k-0992','犬','いぬ','Hund','犬と公園を散歩しました。','Ich bin mit dem Hund im Park spazieren gegangen.',{犬:'いぬ',公園:'こうえん',散歩:'さんぽ'}],
 ['kc2k-0791','雨','あめ','Regen','雨がやんだら、買い物に行きましょう。','Gehen wir einkaufen, wenn der Regen aufgehört hat.',{雨:'あめ',買い物:'かいもの',行きましょう:'いきましょう'}],
 ['kc2k-0786','天気','てんき','Wetter','天気がいいので、外で昼ご飯を食べます。','Weil das Wetter schön ist, esse ich draußen zu Mittag.',{天気:'てんき',外:'そと',昼ご飯:'ひるごはん',食べます:'たべます'}],
 ['kc2k-0283','お金','おかね','Geld','旅行のために、毎月、少しずつお金を貯めています。','Ich spare jeden Monat ein bisschen Geld für eine Reise.',{旅行:'りょこう',毎月:'まいつき',少し:'すこし',お金:'おかね',貯めています:'ためています'}],
 ['kc2k-0405','行く','いく','gehen','明日は、図書館に行くつもりです。','Ich habe vor, morgen in die Bibliothek zu gehen.',{明日:'あした',図書館:'としょかん',行く:'いく'}],
 ['kc2k-0406','来る','くる','kommen','友達が家に来るので、お茶を用意しました。','Weil ein Freund zu mir nach Hause kommt, habe ich Tee vorbereitet.',{友達:'ともだち',家:'いえ',来る:'くる',お茶:'おちゃ',用意:'ようい'}],
 ['kc2k-0404','帰る','かえる','nach Hause zurückkehren','家に帰る前に、牛乳を買います。','Bevor ich nach Hause gehe, kaufe ich Milch.',{家:'いえ',帰る:'かえる',前:'まえ',牛乳:'ぎゅうにゅう',買います:'かいます'}],
 ['kc2k-0668','食べる','たべる','essen','朝ご飯を食べる時間がありませんでした。','Ich hatte keine Zeit zum Frühstücken.',{朝ご飯:'あさごはん',食べる:'たべる',時間:'じかん'}],
 ['kc2k-0669','飲む','のむ','trinken','このお茶は、冷たくして飲むとおいしいです。','Dieser Tee schmeckt gut, wenn man ihn gekühlt trinkt.',{お茶:'おちゃ',冷たく:'つめたく',飲む:'のむ'}],
 ['kc2k-1164','読む','よむ','lesen','電車で読む本を探しています。','Ich suche ein Buch, das ich im Zug lesen kann.',{電車:'でんしゃ',読む:'よむ',本:'ほん',探しています:'さがしています'}],
 ['kc2k-1165','書く','かく','schreiben','漢字を書くときは、形をよく見てください。','Achten Sie beim Schreiben von Kanji bitte genau auf die Form.',{漢字:'かんじ',書く:'かく',形:'かたち',見て:'みて'}],
 ['kc2k-1427','買う','かう','kaufen','新しい靴を買う前に、サイズを確かめます。','Bevor ich neue Schuhe kaufe, überprüfe ich die Größe.',{新しい:'あたらしい',靴:'くつ',買う:'かう',前:'まえ',確かめます:'たしかめます'}],
 ['kc2k-1758','大きい','おおきい','groß','大きい荷物は、ここに置いてください。','Stellen Sie großes Gepäck bitte hier ab.',{大きい:'おおきい',荷物:'にもつ',置いて:'おいて'}],
 ['kc2k-0343','安い','やすい','billig','この店の野菜は、安いのに新鮮です。','Das Gemüse in diesem Laden ist frisch, obwohl es günstig ist.',{店:'みせ',野菜:'やさい',安い:'やすい',新鮮:'しんせん'}]
];
export const DAILY_CONTEXTS_V1 = Object.freeze({
 id:'daily-original-contexts-v1',version:1,packId:'kotoba-core-2000',
 provenance:Object.freeze({origin:'original-ai-authored',author:'OpenAI ChatGPT',rights:'original-project-content',termsURL:'https://openai.com/policies/terms-of-use/',date:'2026-11-15'}),
 review:Object.freeze({status:'self-reviewed',reviewer:'OpenAI ChatGPT',date:'2026-11-15',independentReview:false}),
 records:Object.freeze(rows.map(([packEntryId,word,reading,targetSense,sentence,translation,readings],index)=>Object.freeze({
  id:`daily-context-v1-${String(index+1).padStart(2,'0')}`,packEntryId,word,reading,targetSense,sentence,translation,
  readings:Object.freeze(Object.entries(readings).map(([word,reading])=>Object.freeze({word,reading})))
 })))
});
