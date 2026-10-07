import { currentAdmin, hasAdminPermission } from "@/lib/admin-auth";
import { createOperationalSnapshot, validateOperationalSnapshot, restoreOperationalSnapshot, acquireRecordLease, releaseRecordLease } from "@/lib/structured-record-store";
export const dynamic="force-dynamic";
async function owner(){const admin=await currentAdmin();return admin&&!admin.mustChangePassword&&admin.role==="owner"&&hasAdminPermission(admin,"backups.export")&&hasAdminPermission(admin,"backups.restore")?admin:null;}
export async function GET(){if(!await owner())return Response.json({error:"Unauthorized"},{status:401});const snapshot=await createOperationalSnapshot();return new Response(JSON.stringify(snapshot),{headers:{"content-type":"application/json","content-disposition":'attachment; filename="aloyri-operational-backup.json"',"cache-control":"no-store"}});}
export async function POST(request:Request){
  if(!await owner())return Response.json({error:"Unauthorized"},{status:401});
  if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Invalid origin"},{status:403});
  if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON required"},{status:415});
  const raw=await request.text();if(raw.length>50*1024*1024)return Response.json({error:"Backup too large"},{status:413});
  try{const body=JSON.parse(raw);const snapshot=await validateOperationalSnapshot(body.snapshot);
    if(body.dryRun===true)return Response.json({valid:true,namespace:snapshot.namespace,records:snapshot.records.length,sha256:snapshot.sha256},{headers:{"cache-control":"no-store"}});
    if(body.confirm!=="RESTORE "+snapshot.sha256)return Response.json({error:"Confirm the exact backup checksum."},{status:400});
    const token=await acquireRecordLease("sync-maintenance",300);if(!token)throw new Error("OPERATIONS_BUSY");
    try{return Response.json(await restoreOperationalSnapshot(snapshot),{headers:{"cache-control":"no-store"}});}finally{await releaseRecordLease("sync-maintenance",token);}
  }catch(error){return Response.json({error:error instanceof Error?error.message:"BACKUP_RESTORE_FAILED"},{status:400,headers:{"cache-control":"no-store"}});}
}
