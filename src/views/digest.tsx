import type { DigestRow } from '../digest/types.js';

export function DigestPage({ night, rows, malformedLines = 0 }: { night: string; rows: DigestRow[]; malformedLines?: number }) {
  return (
    <>
      <h1>morning digest · {night}</h1>
      {malformedLines > 0 && <p class="warn">malformed lines: {malformedLines}</p>}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first time</th>
              <th>last time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const warn = row.retries >= 3 || row.failRuns > 0;
              return (
                <tr class={warn ? 'warn' : undefined}>
                  <td>{row.job}</td>
                  <td>{row.owner ?? '—'}</td>
                  <td>{row.runs}</td>
                  <td>{row.retries}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastError ?? '—'}</td>
                  <td>{row.firstTime}</td>
                  <td>{row.lastTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
