import React, { useEffect, useMemo, useState } from "react";

const LEVEL_COLORS = {
  ACCESS: "success",
  ERROR: "danger",
  INFO: "primary",
  EMAIL: "info",
  THIRD_PARTY: "warning",
};

function parseLogLine(line) {
  const columns = line.split("|").map((item) => item.trim());

  if (columns.length < 7) {
    return {
      timestamp: "",
      level: "INFO",
      controller: "-",
      action: "-",
      clientIp: "-",
      message: line,
      details: "",
      method: "",
      endpoint: "",
      statusCode: "",
      provider: "-",
    };
  }

  const timestamp = columns[0] || "";
  const level = columns[1] || "INFO";
  const controller = columns[2] || "-";
  const action = columns[3] || "-";
  const clientIp = columns[4] || "-";
  const message = columns[5] || "";
  const details = columns[6] || "";

  const requestMatch = message.match(/^([A-Z]+)\s+([^\s]+)\s+->\s+(\d{3})/);
  const method = requestMatch ? requestMatch[1] : "";
  const endpoint = requestMatch ? requestMatch[2] : message;
  const statusCode = requestMatch
    ? requestMatch[3]
    : details.match(/StatusCode=(\d{3})/)?.[1] || "";

  const provider = details.match(/Provider=([^\s]+)/)?.[1] || "-";
  const endpointFromDetails =
    details.match(/Endpoint=([^\s]+)/)?.[1] || endpoint;
  const methodFromDetails = details.match(/Method=([^\s]+)/)?.[1] || method;

  return {
    timestamp,
    level,
    controller,
    action,
    clientIp,
    message,
    details,
    method: methodFromDetails || method,
    endpoint: endpointFromDetails || endpoint,
    statusCode,
    provider,
  };
}

export function ApiLogTracker() {
  const today = new Date().toISOString().slice(0, 10);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedStatusCode, setSelectedStatusCode] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (
    date = selectedDate,
    nextPage = page,
    size = pageSize,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ApiLog?date=${date}&page=${nextPage}&pageSize=${size}`,
      );
      if (!response.ok) {
        throw new Error("Unable to fetch API logs");
      }

      const payload = await response.json();
      setAvailableDates(payload.availableDates || []);
      setLogs(payload.logs || []);
      setTotal(payload.total || 0);
      setPage(payload.page || nextPage);
      setPageSize(payload.pageSize || size);
      setSelectedDate(payload.date || date);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedDate, page, pageSize);
  }, []);

  const statusCodes = useMemo(() => {
    const codes = new Set();
    logs.forEach((line) => {
      const parsed = parseLogLine(line);
      if (parsed.statusCode) {
        codes.add(parsed.statusCode);
      }
    });

    return [...codes].sort();
  }, [logs]);

  useEffect(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const cleaned = logs.filter((line) => {
      const parsed = parseLogLine(line);

      const passesLevel =
        selectedLevel === "ALL" || parsed.level === selectedLevel;
      const passesCode =
        selectedStatusCode === "ALL" ||
        parsed.statusCode === selectedStatusCode;

      const searchable = [
        parsed.timestamp,
        parsed.level,
        parsed.controller,
        parsed.action,
        parsed.clientIp,
        parsed.message,
        parsed.details,
        parsed.endpoint,
        parsed.method,
        parsed.statusCode,
        parsed.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);

      return passesLevel && passesCode && passesSearch;
    });

    setFilteredLogs(cleaned);
  }, [logs, selectedLevel, selectedStatusCode, searchText]);

  const summary = useMemo(() => {
    const summaryCounts = {
      ACCESS: 0,
      ERROR: 0,
      INFO: 0,
      EMAIL: 0,
      THIRD_PARTY: 0,
    };

    logs.forEach((line) => {
      const parsed = parseLogLine(line);
      if (summaryCounts[parsed.level] !== undefined) {
        summaryCounts[parsed.level] += 1;
      }
    });

    return summaryCounts;
  }, [logs]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-uppercase small text-muted fw-semibold mb-2">
            Application Monitoring
          </div>
          <h2 className="mb-0">API Log Tracker</h2>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="input-group">
            <label className="input-group-text">Log Date</label>
            <select
              className="form-select"
              value={selectedDate}
              onChange={(e) => {
                const date = e.target.value;
                setSelectedDate(date);
                fetchLogs(date);
              }}
            >
              {availableDates.length === 0 && (
                <option value={selectedDate}>{selectedDate}</option>
              )}
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => fetchLogs(selectedDate)}
          >
            <span className="me-2">↻</span>
            Refresh
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Total Events</div>
              <div className="display-6 fw-semibold mt-2">{total}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Access</div>
              <div className="display-6 fw-semibold mt-2 text-success">
                {summary.ACCESS}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Errors</div>
              <div className="display-6 fw-semibold mt-2 text-danger">
                {summary.ERROR}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Email / Third-party</div>
              <div className="display-6 fw-semibold mt-2 text-info">
                {summary.EMAIL + summary.THIRD_PARTY}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Filter Level</label>
              <select
                className="form-select"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACCESS">Access</option>
                <option value="ERROR">Error</option>
                <option value="INFO">Info</option>
                <option value="EMAIL">Email</option>
                <option value="THIRD_PARTY">Third-party</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Filter HTTP Status
              </label>
              <select
                className="form-select"
                value={selectedStatusCode}
                onChange={(e) => setSelectedStatusCode(e.target.value)}
              >
                <option value="ALL">All Status Codes</option>
                {statusCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Search Endpoint / Action
              </label>
              <input
                className="form-control"
                placeholder="Search by URL, controller, action, IP..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
        <div className="text-muted small">
          Page {page} • {pageSize} entries per page
        </div>
        <div className="btn-group">
          <button
            className="btn btn-outline-secondary"
            disabled={page <= 1 || loading}
            onClick={() => {
              const nextPage = Math.max(page - 1, 1);
              setPage(nextPage);
              fetchLogs(selectedDate, nextPage, pageSize);
            }}
          >
            Previous
          </button>
          <button
            className="btn btn-outline-secondary"
            disabled={logs.length < pageSize || loading}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchLogs(selectedDate, nextPage, pageSize);
            }}
          >
            Next
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="alert alert-info">Loading log entries...</div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Provider</th>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Controller</th>
                    <th>Action</th>
                    <th>Client IP</th>
                    <th>Message</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-4 text-muted">
                        No log entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((line, index) => {
                      const item = parseLogLine(line);
                      const levelClass =
                        LEVEL_COLORS[item.level] || "secondary";

                      return (
                        <tr key={`${selectedDate}-${index}-${line}`}>
                          <td className="small text-muted">{item.timestamp}</td>
                          <td>
                            <span className={`badge bg-${levelClass}`}>
                              {item.level}
                            </span>
                          </td>
                          <td className="small text-dark">
                            {item.provider || item.controller}
                          </td>
                          <td>
                            <span className="fw-semibold">
                              {item.method || "-"}
                            </span>
                          </td>
                          <td className="small text-primary">
                            {item.endpoint || "-"}
                          </td>
                          <td>
                            {item.statusCode ? (
                              <span
                                className={`badge bg-${item.statusCode.startsWith("2") ? "success" : item.statusCode.startsWith("4") ? "warning" : "danger"}`}
                              >
                                {item.statusCode}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="small">{item.controller}</td>
                          <td className="small">{item.action}</td>
                          <td className="small">{item.clientIp}</td>
                          <td className="small">{item.message}</td>
                          <td className="small text-muted">{item.details}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
