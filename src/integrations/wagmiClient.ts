import { createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { http } from "wagmi";

export const wagmiClient = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains: [mainnet] }),
    new InjectedConnector({ chains: [mainnet] }),
    new WalletConnectConnector({
      chains: [mainnet],
      options: {
        projectId: import.meta.env.VITE_WC_PROJECT_ID ?? "",
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
});