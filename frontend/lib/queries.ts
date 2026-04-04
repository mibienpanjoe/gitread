"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchProfile, scoreJobMatch } from "./api";
import type { JobMatchRequest } from "./api";

export function useProfile(username: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfile(username),
    enabled: !!username,
  });
}

export function useJobMatch(username: string) {
  return useMutation({
    mutationFn: (body: JobMatchRequest) => scoreJobMatch(username, body),
  });
}
