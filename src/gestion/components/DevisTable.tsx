import { useDevisTable } from "../../hooks/useDevisTable";
import DevisTableUI from "./DevisTableUI";

export default function DevisTable() {
  const devisTableProps = useDevisTable();

  return <DevisTableUI {...devisTableProps} />;
}