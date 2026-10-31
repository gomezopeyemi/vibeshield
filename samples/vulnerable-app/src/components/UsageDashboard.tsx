import { useEffect, useState } from "react";
import { fetchUsage } from "@/lib/usage";

export function UsageDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchUsage().then((rows) => setData(rows));
  }, [data]);

  return (
    <div>
      {data.map((row: { id: string; label: string }) => (
        <div key={row.id}>{row.label}</div>
      ))}
    </div>
  );
}
