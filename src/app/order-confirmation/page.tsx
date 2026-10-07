import { redirect } from "next/navigation";
import { currentCustomerSession } from "@/lib/customer-auth";
export default async function Page({searchParams}:{searchParams:Promise<{order?:string}>}) {
 const {order=""}=await searchParams;
 const ref=/^WEB-[A-Z0-9-]{8,90}$/i.test(order)?order.toUpperCase():"";
 const session=await currentCustomerSession();
 if(session)redirect("/account"+(ref?"?checkout=complete&order="+encodeURIComponent(ref):""));
 redirect("/track-order"+(ref?"?order="+encodeURIComponent(ref):""));
}
