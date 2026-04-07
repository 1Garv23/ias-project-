import { jsPDF } from "jspdf";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from "@heroicons/react/solid";

const CertificateDetails = ({ certificateData, certificateHash }) => {
  const generatePDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const W = 297; // page width mm
    const H = 210; // page height mm

    /* ── Colour palette (matches website indigo theme) ─────────────────── */
    const INDIGO_DARK  = [49,  46, 129];   // indigo-900
    const INDIGO_MID   = [67,  56, 202];   // indigo-600
    const INDIGO_LIGHT = [199, 210, 254];  // indigo-200
    const GREEN        = [22, 163,  74];   // green-600
    const RED          = [220,  38,  38];  // red-600
    const GOLD         = [180, 130,  20];

    /* ── Outer frame ────────────────────────────────────────────────────── */
    doc.setDrawColor(...INDIGO_DARK);
    doc.setLineWidth(3);
    doc.rect(6, 6, W - 12, H - 12);            // outer
    doc.setLineWidth(0.5);
    doc.setDrawColor(...INDIGO_LIGHT);
    doc.rect(9, 9, W - 18, H - 18);            // inner thin

    /* ── Header banner ──────────────────────────────────────────────────── */
    doc.setFillColor(...INDIGO_DARK);
    doc.rect(6, 6, W - 12, 38, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("CERTIFICATE VERIFICATION REPORT", W / 2, 22, { align: "center" });

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INDIGO_LIGHT);
    doc.text("Blockchain-Authenticated Academic Credential", W / 2, 31, { align: "center" });

    // Decorative line under header
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(20, 44, W - 20, 44);

    /* ── Status seal (top-right corner) ─────────────────────────────────── */
    const sealX = W - 38, sealY = 52, sealR = 16;
    const isValid = certificateData.isValid;
    doc.setFillColor(...(isValid ? GREEN : RED));
    doc.circle(sealX, sealY, sealR, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(sealX, sealY, sealR - 2, "S");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(isValid ? "✓ VALID" : "✗ REVOKED", sealX, sealY - 1, { align: "center" });
    doc.setFontSize(6);
    doc.text("VERIFIED", sealX, sealY + 4, { align: "center" });

    /* ── Certificate fields (two columns) ───────────────────────────────── */
    const labelColor = INDIGO_MID;
    const valueColor = [30, 30, 30];

    const printField = (label, value, x, y) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...labelColor);
      doc.text(label.toUpperCase(), x, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...valueColor);
      doc.text(String(value || "—"), x, y + 6);
    };

    // Left column
    printField("Student Name",    certificateData.studentName,    22, 58);
    printField("Course / Program", certificateData.course,         22, 74);
    printField("Institution",     certificateData.institution,     22, 90);
    printField("Credential Type", certificateData.credentialType,  22, 106);

    // Right column
    printField("Grade / Score",   certificateData.grade,          W / 2 + 5, 58);
    printField("Duration",        certificateData.duration,       W / 2 + 5, 74);
    printField("Issue Date",      certificateData.issueDate,       W / 2 + 5, 90);
    printField("Status",          isValid ? "VALID — Active & Verified" : "REVOKED", W / 2 + 5, 106);

    /* ── Divider ────────────────────────────────────────────────────────── */
    doc.setDrawColor(...INDIGO_LIGHT);
    doc.setLineWidth(0.4);
    doc.line(22, 120, W - 22, 120);

    /* ── Certificate hash block ─────────────────────────────────────────── */
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(22, 124, W - 44, 22, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...INDIGO_MID);
    doc.text("BLOCKCHAIN CERTIFICATE HASH", 26, 131);
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    const hashStr = String(certificateHash);
    doc.text(hashStr, 26, 140, { maxWidth: W - 52 });

    /* ── Footer ─────────────────────────────────────────────────────────── */
    doc.setFillColor(...INDIGO_DARK);
    doc.rect(6, H - 22, W - 12, 16, "F");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...INDIGO_LIGHT);
    doc.text(
      `Generated on ${new Date().toLocaleString()} · Decentralized Academic Certificate Registry`,
      W / 2, H - 16, { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "This document is cryptographically sealed on-chain. Verify at any time using the certificate hash above.",
      W / 2, H - 10, { align: "center" }
    );

    /* ── Subtle watermark ───────────────────────────────────────────────── */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(52);
    doc.setTextColor(220, 220, 240);
    doc.saveGraphicsState();
    doc.text("VERIFIED", W / 2, H / 2 + 10, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();

    doc.save("certificate-verification-report.pdf");
  };

  return (
    <div className="container mx-auto mt-8 px-6">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
            <InformationCircleIcon className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Certificate Details</h2>
        </div>

        <div className="space-y-4">
          <p><strong className="text-gray-700">Student Name:</strong> {certificateData.studentName}</p>
          <p><strong className="text-gray-700">Course:</strong> {certificateData.course}</p>
          <p><strong className="text-gray-700">Institution:</strong> {certificateData.institution}</p>
          <p><strong className="text-gray-700">Duration:</strong> {certificateData.duration}</p>
          <p><strong className="text-gray-700">Grade:</strong> {certificateData.grade}</p>
          <p><strong className="text-gray-700">Credential Type:</strong> {certificateData.credentialType}</p>
          <p><strong className="text-gray-700">Issue Date:</strong> {certificateData.issueDate}</p>
          <p className="flex items-center gap-2">
            <strong className="text-gray-700">Status:</strong>
            {certificateData.isValid ? (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            ) : (
              <XCircleIcon className="w-6 h-6 text-red-500" />
            )}
            {certificateData.isValid ? "Valid" : "Revoked"}
          </p>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={generatePDF}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Download Certificate PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateDetails;
