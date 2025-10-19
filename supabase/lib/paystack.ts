import axios from "axios";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

export const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  },
});
