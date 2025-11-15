// src/utils/pdfExport.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MedicalReport, ExtractedParameter } from '../components/ReportAnalyzer'; // Adjust path as needed

// Define the structure for WHO_NORMAL_RANGES if it's not already globally accessible
interface WHONormalRangeDefinition {
    min?: number;
    max?: number;
    unit?: string;
    type: 'numeric' | 'qualitative' | 'greater_than' | 'less_than';
    description: string;
}

interface WHONormalRanges {
    [key: string]: WHONormalRangeDefinition;
}

export const PDFExportUtil = {
    async exportReportToPdf(
        report: MedicalReport,
        whoNormalRanges: WHONormalRanges, // Pass the WHO_NORMAL_RANGES as an argument
        userName: string = 'User'
    ) {
        const reportElement = document.createElement('div');
        reportElement.style.padding = '20px';
        reportElement.style.fontFamily = 'Arial, sans-serif';
        reportElement.style.color = '#333';
        reportElement.style.background = '#fff';
        reportElement.style.width = '794px'; // A4 width in pixels (approx) for better rendering

        reportElement.innerHTML = `
            <style>
                h1, h2, h3, h4 { color: #1f2937; margin-bottom: 10px; }
                p { margin-bottom: 5px; line-height: 1.5; }
                ul { list-style: none; padding: 0; }
                li { margin-bottom: 3px; display: flex; align-items: flex-start; }
                .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px; flex-shrink: 0; margin-top: 6px;}
                .status-normal { background-color: #22C55E; }
                .status-high, .status-low, .status-critical-high, .status-critical-low, .status-positive { background-color: #EF4444; } /* Red */
                .status-elevated, .status-borderline-high, .status-slightly-high, .status-slightly-low { background-color: #FBBF24; } /* Amber */
                .status-indeterminate { background-color: #6B7280; } /* Gray */
                .section-header { margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 1.1em; font-weight: bold; }
            </style>
            <h1 style="text-align: center; color: #1e40af; margin-bottom: 20px;">Medical Report Analysis</h1>
            <p style="text-align: center; color: #555; font-size: 0.9em;">Generated on: ${new Date().toLocaleDateString()} for ${userName}</p>
            <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">

            <h2 style="color: #1d4ed8;">${report.reportType}</h2>
            <p><strong>File Name:</strong> ${report.fileName}</p>
            <p><strong>Upload Date:</strong> ${report.uploadDate.toLocaleDateString()}</p>

            <h3 class="section-header">Extracted Data:</h3>
            <ul>
                ${Object.entries(report.extractedData).map(([key, data]) => {
                    const statusClass = data.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace('critical', 'critical-'); // Adjust for critical high/low

                    const normalRangeInfo = whoNormalRanges[key]
                        ? ` (WHO Ref: ${whoNormalRanges[key].type === 'numeric' ? `${whoNormalRanges[key].min}-${whoNormalRanges[key].max}` :
                                           whoNormalRanges[key].type === 'greater_than' ? `>${whoNormalRanges[key].min}` :
                                           whoNormalRanges[key].type === 'less_than' ? `<${whoNormalRanges[key].max}` :
                                           data.normalRange})`
                        : ` (Normal: ${data.normalRange})`;

                    return `
                        <li>
                            <span class="status-dot status-${statusClass}"></span>
                            <div>
                                <strong>${key}:</strong> ${data.value} ${data.unit}
                                ${normalRangeInfo}
                                - <strong style="color: ${
                                    data.status.includes('High') || data.status.includes('Low') || data.status === 'Positive' || data.status.includes('Critical')
                                        ? '#EF4444' // Red
                                        : data.status.includes('Elevated') || data.status.includes('Borderline') || data.status.includes('Slightly')
                                        ? '#FBBF24' // Amber
                                        : '#22C55E' // Green
                                }">${data.status}</strong>
                            </div>
                        </li>
                    `;
                }).join('')}
            </ul>

            <h3 class="section-header">Analysis:</h3>
            <p>${report.analysis}</p>

            <h3 class="section-header">Suggestion:</h3>
            <p>${report.suggestion}</p>

            <h3 class="section-header">Prescription:</h3>
            <p>${report.prescription}</p>
        `;

        document.body.appendChild(reportElement); // Temporarily append for canvas rendering

        try {
            const canvas = await html2canvas(reportElement, { scale: 2 }); // Higher scale for better quality
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`${report.fileName.replace(/\.[^/.]+$/, "")}_Analyzed_Report.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            document.body.removeChild(reportElement); // Clean up
        }
    }
};