
import { useCurrencyContext } from "../context/CurrencyContext";

export default function useCurrency() {
    return useCurrencyContext();
}

export { useCurrencyContext };
