import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { USERS_CSS } from "./Users/usersStyles";
import { isLowSignal } from "./Users/usersHelpers";
import UsersView from "./Users/UsersView";

function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const ensureSuccess = (result, msg) => {
    if (result.success) return result.data;
    throw new Error(result.error || msg);
  };

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [promoteRole, setPromoteRole] = useState("moderator");
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [promoteDialog, setPromoteDialog] = useState(false);
  const [actionError, setActionError] = useState("");

  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => ensureSuccess(await usersAPI.getAll(), "Failed to load users"),
  });

  const suspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.suspend(id), "Failed to suspend user"),
    onSuccess: () => {
      setActionError("");
      setSuspendDialog(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err.message || "Failed to suspend user"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.unsuspend(id), "Failed to unsuspend user"),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err.message || "Failed to unsuspend user"),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) =>
      ensureSuccess(await usersAPI.updateRole(id, role), "Failed to update role"),
    onSuccess: () => {
      setActionError("");
      setPromoteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err.message || "Failed to update role"),
  });

  useEffect(() => {
    if (selectedId) {
      setActionError("");
      const u = users.find((x) => x.id === selectedId);
      if (u) setPromoteRole(u.role === "citizen" ? "moderator" : u.role);
    }
  }, [selectedId, users]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter === "active" && u.isSuspended) return false;
    if (statusFilter === "suspended" && !u.isSuspended) return false;
    return true;
  });

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const kpis = {
    total: users.length,
    active: users.filter((u) => !u.isSuspended).length,
    suspended: users.filter((u) => u.isSuspended).length,
    mods: users.filter(
      (u) =>
        u.role === "moderator" ||
        u.role === "admin" ||
        u.role === "law_enforcement",
    ).length,
    lowSignal: users.filter((u) => isLowSignal(u)).length,
  };

  return (
    <>
      <style>{USERS_CSS}</style>
      <UsersView
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filtered={filtered}
        isLoading={isLoading}
        isError={isError}
        error={error}
        refetch={refetch}
        selectedId={selectedId}
        onSelectUser={setSelectedId}
        selected={selected}
        kpis={kpis}
        isAdmin={isAdmin}
        onOpenPromote={() => setPromoteDialog(true)}
        onOpenSuspend={() => setSuspendDialog(true)}
        suspendDialog={suspendDialog}
        onCloseSuspend={() => {
          setSuspendDialog(false);
          setActionError("");
        }}
        promoteDialog={promoteDialog}
        onClosePromote={() => {
          setPromoteDialog(false);
          setActionError("");
        }}
        actionError={actionError}
        suspendMutation={suspendMutation}
        unsuspendMutation={unsuspendMutation}
        roleMutation={roleMutation}
        promoteRole={promoteRole}
        onPromoteRoleChange={setPromoteRole}
        onConfirmSuspend={() => selected && suspendMutation.mutate(selected.id)}
        onConfirmPromote={() =>
          selected && roleMutation.mutate({ id: selected.id, role: promoteRole })
        }
      />
    </>
  );
}

export default Users;
