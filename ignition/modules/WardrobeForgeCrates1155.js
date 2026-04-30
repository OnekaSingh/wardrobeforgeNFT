import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("WardrobeForgeCrates1155Module", (m) => {
  const initialOwner = m.getParameter("initialOwner");
  const initialTreasury = m.getParameter("initialTreasury");
  const baseMetadataURI = m.getParameter("baseMetadataURI", "ipfs://wardrobeforge/");

  const wardrobeForgeCrates1155 = m.contract("WardrobeForgeCrates1155", [
    initialOwner,
    initialTreasury,
    baseMetadataURI,
  ]);

  return { wardrobeForgeCrates1155 };
});
