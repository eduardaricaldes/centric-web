import { useQuery } from "@tanstack/react-query";
import { listMinistries, listMinistryMembers } from "../../api/ministries";

/** Só ADMIN/LEADER — as duas rotas de `GET /ministries` exigem isso. */
export function useMinistries(enabled: boolean) {
  return useQuery({
    queryKey: ["ministries"],
    queryFn: () => listMinistries(),
    enabled,
  });
}

export function useMinistryMembers(ministryId: number | null) {
  return useQuery({
    queryKey: ["ministry-members", ministryId],
    queryFn: () => listMinistryMembers(ministryId as number),
    enabled: ministryId !== null,
  });
}
