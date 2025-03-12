import { useMutation } from "@tanstack/react-query";
import axios from "axios";

interface UserInput {
  username: string;
  email: string;
  password: string;
  role: string;
}

interface UserResponse {
  id?: string;
  username: string;
  email: string;
  role: string;
}

export const useLoginUser = () => {
  return useMutation<UserResponse, Error, UserInput>({
    mutationFn: async (credentials: UserInput) => {
      const response = await axios.post<UserResponse>(
        "/auth/login",
        credentials
      );
      return response.data;
    },
  });
};

export const useRegisterUser = () => {
  return useMutation<UserResponse, Error, UserInput>({
    mutationFn: async (userData) => {
      const response = await axios.post<UserInput>(
        "/auth/register",
        userData
      );
      return response.data;
    },
  });
};
