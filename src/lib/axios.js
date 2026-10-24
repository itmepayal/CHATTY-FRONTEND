import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chatty-backend-2l2t.onrender.com/api/v1",
  withCredentials: true,
});
