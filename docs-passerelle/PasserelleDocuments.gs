/**
 * CAT-SRPGE - Passerelle documentaire TEST, projet Apps Script distinct.
 * Copier ce fichier dans PasserelleDocuments.gs après validation.
 * Ne JAMAIS exposer les autorisations Drive dans un GitHub Pages public.
 * Prérequis : propriétés du script ROOT_FOLDER_ID (ID dossier privé)
 *              et FIREBASE_API_KEY (clé WEB publique du projet).
 * Web app exécute comme PROPRIÉTAIRE. NE PAS ouvrir à "Tout le monde"
 * avant les tests de séparation des comptes, anti-abus et quotas.
 * Toute validation de droits doit être faite côté serveur.
 */
const CAT_DOC = Object.freeze({
  database: 'https://cat-collectif-actionnaires-default-rtdb.europe-west1.firebasedatabase.app',
  maxBytes: 4 * 1024 * 1024,
  mime: ['application/pdf', 'image/png', 'image/jpeg'],
  types: ['bulletin', 'justificatif']
});
function catProps_() {
  const p = PropertiesService.getScriptProperties();
  const rootId=p.getProperty('ROOT_FOLDER_ID'), apiKey=p.getProperty('FIREBASE_API_KEY');
  if (!rootId || !apiKey) throw Error('Configuration serveur manquante');
  return {rootId,apiKey};
}
function catFetchJson_(url,options) {
  const r=UrlFetchApp.fetch(url,{muteHttpExceptions:true,...(options||{})});
  if(r.getResponseCode()<200||r.getResponseCode()>299) throw Error('Authentification ou accès refusé');
  return JSON.parse(r.getContentText()||'{}');
}
function catPrincipal_(idToken) {
  if(typeof idToken!=='string'||idToken.length<100||idToken.length>5000) throw Error('Connexion Firebase requise');
  const conf=catProps_();
  const data=catFetchJson_('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(conf.apiKey),{
    method:'post',contentType:'application/json',
    payload:JSON.stringify({idToken})
  });
  const u=data.users&&data.users[0];
  if(!u||!u.localId||u.disabled) throw Error('Compte Firebase non autorisé');
  return {uid:u.localId,token:idToken};
}
function catDossier_(uid,token) {
  const obj=catFetchJson_(CAT_DOC.database+'/dossiers/'+encodeURIComponent(uid)+'.json?auth='+encodeURIComponent(token));
  if(!obj||!Array.isArray(obj.projets)) throw Error('Dossier actionnaire inexistant');
  return obj;
}
function catRole_(actor,ownerUid,operationId) {
  if(typeof ownerUid!=='string'||!(/^[A-Za-z0-9]{10,128}$/).test(ownerUid))throw Error('Dossier invalide');
  if(typeof operationId!=='string'||!(/^[A-Za-z0-9-]{8,150}$/).test(operationId)||!operationId.startsWith('op-'))throw Error('Identifiant opération invalide');
  let owner=false, dossier;
  if(actor.uid===ownerUid) {
    dossier=catDossier_(ownerUid,actor.token);
    owner=true;
  } else {
    // Lecture de la racine 'dossiers' permise aux administrateurs seulement.
    // Les règles Firebase doivent le confirmer. Aucune liste d'admin codée côté client.
    catFetchJson_(CAT_DOC.database+'/dossiers.json?auth='+encodeURIComponent(actor.token));
    dossier=catDossier_(ownerUid,actor.token);
  }
  const op=dossier.projets.find(x=>x&&x.operationId===operationId);
  if(!op) throw Error('La souscription ne correspond pas à ce dossier');
  return {owner,op};
}
function catChild_(folder,name,create) {
  const it=folder.getFoldersByName(name);
  if(it.hasNext())return it.next();
  if(!create)return null;
  return folder.createFolder(name);
}
function catFolder_(uid,operationId,create) {
  // Noms basés sur identifiants permanents, non sur OP-001 réutilisable.
  const root=DriveApp.getFolderById(catProps_().rootId);
  const perso=catChild_(root,'UID-'+uid,create);
  return perso?catChild_(perso,'OPID-'+operationId,create):null;
}
function catMimeOk_(bytes,mime) {
  const x=bytes.slice(0,8).map(n=>(n+256)%256);
  if(mime==='application/pdf')return x[0]===37&&x[1]===80&&x[2]===68&&x[3]===70;
  if(mime==='image/png')return x.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
  if(mime==='image/jpeg')return x[0]===255&&x[1]===216&&x[2]===255;
  return false;
}
function catUpload(args) {
  const actor=catPrincipal_(args&&args.idToken);
  const uid=args.ownerUid, opId=args.operationId, type=args.type;
  if(actor.uid!==uid)throw Error('Seul le propriétaire peut déposer ses documents');
  catRole_(actor,uid,opId);
  if(!CAT_DOC.types.includes(type))throw Error('Type de pièce invalide');
  if(!CAT_DOC.mime.includes(args.mime))throw Error('Format non accepté');
  // Limite élémentaire anti-abus par compte / heure (à valider avant ouverture publique).
  const quotaKey='cat-upload-'+uid;
  const cache=CacheService.getScriptCache();
  const count=Number(cache.get(quotaKey)||0);
  if(count>=12)throw Error('Limite temporaire de dépôts atteinte. Réessaie plus tard.');
  if(typeof args.base64!=='string'||args.base64.length>CAT_DOC.maxBytes*1.38)throw Error('Fichier trop volumineux');
  const bytes=Utilities.base64Decode(args.base64);
  if(bytes.length>CAT_DOC.maxBytes||!catMimeOk_(bytes,args.mime))throw Error('Contenu de fichier non conforme');
  const ext= args.mime==='application/pdf'?'pdf':args.mime==='image/png'?'png':'jpg';
  const folder=catFolder_(uid,opId,true);
  const name=type+'-'+Utilities.getUuid()+'.'+ext;
  const f=folder.createFile(Utilities.newBlob(bytes,args.mime,name));
  f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  cache.put(quotaKey,String(count+1),3600);
  return {ok:true,fileId:f.getId(),name:f.getName(),type,operationId:opId};
}
function catList(args) {
  const actor=catPrincipal_(args&&args.idToken);
  catRole_(actor,args.ownerUid,args.operationId);
  const folder=catFolder_(args.ownerUid,args.operationId,false);
  if(!folder)return [];
  const it=folder.getFiles(),out=[];
  while(it.hasNext()&&out.length<100){
    const f=it.next();
    out.push({id:f.getId(),name:f.getName(),mime:f.getMimeType(),size:f.getSize()});
  }
  return out;
}
function catDownload(args) {
  const actor=catPrincipal_(args&&args.idToken);
  catRole_(actor,args.ownerUid,args.operationId);
  const folder=catFolder_(args.ownerUid,args.operationId,false);
  if(!folder)throw Error('Aucune pièce jointe');
  const file=DriveApp.getFileById(args.fileId);
  // Empêche de télécharger un fichier appartenant à un autre dossier Drive.
  const parents=file.getParents(); let allowed=false;
  while(parents.hasNext())if(parents.next().getId()===folder.getId())allowed=true;
  if(!allowed)throw Error('Document non autorisé');
  if(file.getSize()>CAT_DOC.maxBytes)throw Error('Document trop volumineux');
  return {name:file.getName(),mime:file.getMimeType(),base64:Utilities.base64Encode(file.getBlob().getBytes())};
}
function doGet() {
  return HtmlService.createHtmlOutputFromFile('InterfaceDocuments').setTitle('CAT-SRPGE — Pièces justificatives');
}
