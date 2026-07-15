const OWNER_ROUTE_PREFIXES = [
    "/bills",
  ] as const;
  
  export function requiresOwnerSession(
    pathname: string,
  ): boolean {
    return OWNER_ROUTE_PREFIXES.some(
      (prefix) =>
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`),
    );
  }