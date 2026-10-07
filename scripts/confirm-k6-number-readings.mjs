import fs from 'node:fs';
import '../js/lesson-classroom-core.js';
const file='lessons/k6-行かせていただきたいんですが/data.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
for(const section of data.supplementalSections)for(const item of section.items||[]){
 const reading=item.classroom?.readingReview;
 if(!item.classroom?.priorityReviewed||reading?.status!=='partial')continue;
 if(item.id==='p151-line-15'){
  item.speechReading='ゼロ さん の さん さん さん の さん さん さん';
  reading.note='依使用者指定讀法：ゼロ さん の さん さん さん の さん さん さん。0讀ゼロ，分隔處讀の；畫面及教材原句不變。修改後待使用者重新試聽確認，不冒充教師核對。';
 }else{
  reading.status='user-confirmed';
  reading.note='使用者於2026-10-07逐一試聽後回覆「其他都確認」；記錄使用者確認，不冒充教師確認或課本完整注音。';
  reading.userConfirmation={by:'使用者',date:'2026-10-07',method:'本聊天使用者回覆：電話0需調整，其他都確認。'};
 }
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
