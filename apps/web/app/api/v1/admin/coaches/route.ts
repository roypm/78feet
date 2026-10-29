import { listCoaches } from "@/lib/box/staff-users";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => listCoaches());
