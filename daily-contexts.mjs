/* Additive display metadata only. Never hydrate, repair, save or mutate a card. */
import {DAILY_CONTEXTS_V1} from './content/daily/contexts-v1.mjs';
import {genericContext,usableContext} from './daily-quality.mjs';
const normalized=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('de-DE');
export function contextForCard(card,catalog=[]) {
 if(!card||card.source!=='core'||(card.packId&&card.packId!==DAILY_CONTEXTS_V1.packId))return null;
 // Even short/unusual personal examples are not silently replaced.
 if(String(card.example??'').trim()&&!genericContext(card.example))return null;
 const row=DAILY_CONTEXTS_V1.records.find(row=>row.packEntryId===String(card.packEntryId||card.id)&&row.word===card.word&&row.reading===card.reading);
 if(!row||!Array.isArray(catalog))return null;
 const entry=catalog.find(entry=>entry.packEntryId===row.packEntryId&&entry.word===row.word&&entry.reading===row.reading);
 if(!entry)return null;
 // A translation-only personal edit is protected as well; never combine it
 // with an unrelated Japanese sentence or silently conceal it with the overlay.
 if(String(card.exampleTranslation??'').trim()&&String(card.exampleTranslation).trim()!==String(entry.exampleTranslation??'').trim())return null;
 if(!Array.isArray(card.meanings)||!card.meanings.some(meaning=>normalized(meaning)===normalized(row.targetSense)))return null;
 return row;
}
export function withDailyContexts(cards=[],catalog=[]) {
 return (Array.isArray(cards)?cards:[]).map(card=>({...card,dailyContext:contextForCard(card,catalog)}));
}
export function displayContext(card) {
 if(usableContext(card?.example))return {sentence:card.example,translation:card.exampleTranslation||'',readings:[],id:null};
 const row=card?.dailyContext;
 if(row&&DAILY_CONTEXTS_V1.records.includes(row)&&row.word===card.word&&row.reading===card.reading&&row.packEntryId===String(card.packEntryId||card.id))return row;
 return {sentence:'',translation:'',readings:[],id:null};
}
