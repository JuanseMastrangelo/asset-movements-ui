import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface AssetBalance {
  id: string;
  name: string;
  quantity: number;
}

const fetchAssetsBalance = async (): Promise<AssetBalance[]> => {
  const { data } = await axios.get<AssetBalance[]>("/assets-balance");
  return data;
};

export const useAssetsBalance = () => {
  return useQuery({
    queryKey: ["assets-balance"],
    queryFn: fetchAssetsBalance,
  });
};
