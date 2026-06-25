import React, { useEffect, useRef } from "react";

export default function EldLogSheet({ logData }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Clear and set scale for high-DPI displays
    const width = 1000;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Title / Headers
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillText("DRIVER'S DAILY LOG", 30, 40);

    ctx.font = "12px 'Courier New', monospace";
    ctx.fillText(`Date: ${logData.date || "N/A"}`, 30, 70);
    ctx.fillText(`Carrier: ${logData.carrier_name || "N/A"}`, 250, 70);
    ctx.fillText(`Shipper/Commodity: ${logData.shipper_commodity || "N/A"}`, 600, 70);

    // Grid details
    const gridX = 140;
    const gridY = 120;
    const gridWidth = 720; // 24 hours * 30px per hour
    const rowHeight = 40; // 4 rows
    const gridHeight = rowHeight * 4;

    const statuses = ["1. OFF DUTY", "2. SLEEPER BERTH", "3. DRIVING", "4. ON DUTY (ND)"];
    
    // Draw row labels
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px Arial";
    statuses.forEach((status, idx) => {
      ctx.fillText(status, 15, gridY + (idx * rowHeight) + 24);
    });

    // Draw grid border & horizontal lines
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX, gridY, gridWidth, gridHeight);

    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(gridX, gridY + i * rowHeight);
      ctx.lineTo(gridX + gridWidth, gridY + i * rowHeight);
      ctx.stroke();
    }

    // Draw vertical hour columns & hour numbers
    ctx.fillStyle = "#475569";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";

    // Draw vertical lines and hours
    for (let hour = 0; hour <= 24; hour++) {
      const x = gridX + hour * (gridWidth / 24);
      
      // Draw hour labels
      let label = hour;
      if (hour === 0 || hour === 24) label = "Mdt";
      else if (hour === 12) label = "Noon";
      else if (hour > 12) label = hour - 12;

      ctx.fillText(label.toString(), x, gridY - 10);

      // Vertical line
      ctx.strokeStyle = hour % 12 === 0 ? "#1e293b" : "#94a3b8";
      ctx.lineWidth = hour % 12 === 0 ? 1.5 : 1;
      
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x, gridY + gridHeight);
      ctx.stroke();

      // Quarter-hour sub-marks
      if (hour < 24) {
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 0.5;
        for (let q = 1; q <= 3; q++) {
          const qx = x + q * (gridWidth / 96);
          ctx.beginPath();
          ctx.moveTo(qx, gridY);
          ctx.lineTo(qx, gridY + gridHeight);
          ctx.stroke();
        }
      }
    }

    // Draw Right-side Totals Column
    const totalsX = gridX + gridWidth + 20;
    ctx.textAlign = "left";
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 12px Arial";
    ctx.fillText("Total Hours", totalsX, gridY - 10);
    
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(totalsX - 5, gridY, 80, gridHeight);
    
    // Horizontal dividers for totals
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(totalsX - 5, gridY + i * rowHeight);
      ctx.lineTo(totalsX + 75, gridY + i * rowHeight);
      ctx.stroke();
    }

    // Write the totals in the boxes
    const totals = logData.totals || { off_duty: 24, sleeper: 0, driving: 0, on_duty: 0 };
    const totalsArray = [totals.off_duty, totals.sleeper, totals.driving, totals.on_duty];
    
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    totalsArray.forEach((val, idx) => {
      ctx.fillText(val.toFixed(2), totalsX + 35, gridY + (idx * rowHeight) + 25);
    });

    // Write total sum (must be 24)
    ctx.font = "bold 12px Arial";
    ctx.fillText("24.00", totalsX + 35, gridY + gridHeight + 20);

    // ----------------------------------------------------
    // DRAW THE HOS STATUS PATH
    // ----------------------------------------------------
    const grid = logData.grid || Array(96).fill(1); // 96 intervals
    const getRowY = (status) => {
      // status 1 = OFF DUTY (Row 0)
      // status 2 = SLEEPER (Row 1)
      // status 3 = DRIVING (Row 2)
      // status 4 = ON DUTY (Row 3)
      const rowIndex = status - 1;
      return gridY + (rowIndex * rowHeight) + (rowHeight / 2);
    };

    ctx.strokeStyle = "#2563eb"; // Blue line for logs
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    
    // Set starting position
    let startX = gridX;
    let startY = getRowY(grid[0]);
    ctx.moveTo(startX, startY);

    for (let i = 0; i < 96; i++) {
      const currentStatus = grid[i];
      const nextStatus = i < 95 ? grid[i + 1] : currentStatus;
      
      const segmentWidth = gridWidth / 96;
      const endX = gridX + (i + 1) * segmentWidth;
      const currentY = getRowY(currentStatus);

      // Horizontal line for current interval
      ctx.lineTo(endX, currentY);

      // If status changes next interval, draw vertical connection
      if (currentStatus !== nextStatus) {
        const nextY = getRowY(nextStatus);
        ctx.lineTo(endX, nextY);
      }
    }
    ctx.stroke();

    // ----------------------------------------------------
    // DRAW RECAP AND REMARKS
    // ----------------------------------------------------
    ctx.textAlign = "left";
    ctx.fillStyle = "#1e293b";
    
    // Remarks
    ctx.font = "bold 13px Arial";
    ctx.fillText("REMARKS & EVENTS", 30, 310);
    ctx.font = "11px Arial";
    ctx.fillStyle = "#475569";
    
    const remarks = logData.remarks || [];
    const maxRemarksToShow = 6;
    remarks.slice(0, maxRemarksToShow).forEach((remark, idx) => {
      ctx.fillText(remark, 30, 335 + idx * 16);
    });
    if (remarks.length > maxRemarksToShow) {
      ctx.fillText(`... and ${remarks.length - maxRemarksToShow} more events`, 30, 335 + maxRemarksToShow * 16);
    }

    // Recap
    const recapX = 580;
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 13px Arial";
    ctx.fillText("RECAP (70-Hour / 8-Day)", recapX, 310);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#475569";
    const recap = logData.recap || { duty_today: 0, total_7_days: 0, available_tomorrow: 70 };
    
    ctx.fillText(`A. Duty hours today (Driving + On-Duty):`, recapX, 335);
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${recap.duty_today} hrs`, recapX + 280, 335);

    ctx.font = "11px Arial";
    ctx.fillText(`B. Total duty hours last 7 days (including today):`, recapX, 355);
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${recap.total_7_days} hrs`, recapX + 280, 355);

    ctx.font = "11px Arial";
    ctx.fillText(`C. Total hours available for tomorrow:`, recapX, 375);
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${recap.available_tomorrow} hrs`, recapX + 280, 375);

    ctx.font = "11px Arial";
    ctx.fillText(`D. Total Miles Driven Today:`, recapX, 395);
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${logData.miles_today || 0} mi`, recapX + 280, 395);

  }, [logData]);

  return (
    <div className="eld-log-container" style={{ overflowX: "auto" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          margin: "0 auto",
          maxWidth: "100%",
          borderRadius: "8px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      />
    </div>
  );
}
