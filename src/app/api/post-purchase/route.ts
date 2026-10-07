import { currentCustomerSession } from "@/lib/customer-auth";
export const dynamic="force-dynamic";
export async function POST(){
 const session=await currentCustomerSession();
 return Response.json({error:session?"Use your signed-in account to view order history.":"Sign in required."},{status:session?410:401,headers:{"Cache-Control":"no-store"}});
}
