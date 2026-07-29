# Developer Reference Guide: Adjusting & Customizing the MOH Radiology Request Form (PER.SS-RA301)

This guide provides step-by-step instructions on how to modify, align, add, or customize fields in the printable **MOH Radiology Request Form (PER.SS-RA301)** PDF document in **HealthGrid IQ**.

---

## 1. File Location & Core Architecture

- **Primary Source File**: [`src/components/ui/PrintRadiologyForm.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/components/ui/PrintRadiologyForm.tsx)
- **Rendering Libraries**:
  - **`html2canvas`**: Captures the hidden HTML DOM element (`MOHFormPrintView`) and converts it into a high-resolution image canvas.
  - **`jsPDF`**: Converts the canvas image into a downloadable A4 PDF document (`MOH_Radiology_Request_[caseNumber].pdf`).

> [!IMPORTANT]
> **Why HTML Tables?**
> `html2canvas` renders pure HTML `<table>` structures with 100% precision. Modern CSS flexbox rules (e.g. `display: flex`, `gap`) can cause strikethrough lines or baseline misalignment in canvas export engines. **Always maintain the `<table>` structure when making layout edits.**

---

## 2. Document Page Structure

The PDF document consists of two main A4 page blocks:

```tsx
<div style={{ fontFamily: 'Arial, sans-serif', width: '200mm', margin: '0 auto' }}>

  {/* ── PAGE 1: RADIOLOGY EXAMINATION REQUEST FORM ── */}
  <div style={{ width: '200mm', padding: '8mm', boxSizing: 'border-box' }}>
    {/* Header, Patient Info Table, Office Use Table, Requested Service, Clinical Notes */}
  </div>

  {/* ── PAGE 2: RADIOLOGY REPORT ── */}
  <div style={{ width: '200mm', padding: '8mm', boxSizing: 'border-box' }}>
    {/* Report Header, Patient Summary, Diagnostic Findings & Impressions, Signatures */}
  </div>

</div>
```

---

## 3. How to Adjust Form Elements

### A. Adjusting Header Title & Hospital Name

Locate the Document Header table at the top of Page 1:

```tsx
<table style={{ width: '100%', marginBottom: '8px', borderCollapse: 'collapse' }}>
  <tbody>
    <tr>
      <td style={{ textAlign: 'center', width: '80%' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>MINISTRY OF HEALTH MALAYSIA</div>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>RADIOLOGY EXAMINATION REQUEST FORM</div>
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          <strong>HOSPITAL / CLINIC:</strong>{' '}
          <span style={{ borderBottom: '1px solid #000', padding: '0 10px', fontWeight: 'bold' }}>
            {caseItem.clinicName || 'Default Hospital Name'}
          </span>
        </div>
      </td>
      <td style={{ textAlign: 'right', verticalAlign: 'top', width: '20%', fontSize: '9px', fontWeight: 'bold' }}>
        MOH PER.SS-RA301<br />(Rev1/2018)
      </td>
    </tr>
  </tbody>
</table>
```
- **To change font size**: Modify `fontSize: '14px'`.
- **To change form code**: Update `MOH PER.SS-RA301`.

---

### B. Adjusting Column Width Ratio (Patient Info vs. Office Use)

Page 1 uses a 2-column layout. The column ratio is controlled in the Outer Split Table:

```tsx
<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
  <tbody>
    <tr>
      {/* LEFT COLUMN: Patient Info (Default: 65%) */}
      <td style={{ width: '65%', verticalAlign: 'top', border: '1px solid #000', padding: '4px' }}>
        ...
      </td>

      {/* RIGHT COLUMN: Office Use & Exposure (Default: 35%) */}
      <td style={{ width: '35%', verticalAlign: 'top', border: '1px solid #000', borderLeft: 'none', padding: '4px' }}>
        ...
      </td>
    </tr>
  </tbody>
</table>
```
- **To make Patient Info wider**: Change `width: '65%'` to `70%` and `width: '35%'` to `30%` (ensure the sum equals `100%`).

---

### C. Adding a New Text Field with an Underline

To add a new input field with an underlined baseline (e.g. `Emergency Contact`):

```tsx
<tr>
  <td style={{ width: '110px', fontWeight: 'bold', padding: '3px 0' }}>Emergency Contact:</td>
  <td style={{ borderBottom: '1px solid #000', padding: '3px 4px' }}>{patient?.emergencyContact || '—'}</td>
</tr>
```
- `width: '110px'`: Sets fixed label width to keep all labels aligned vertically.
- `borderBottom: '1px solid #000'`: Draws a clean underline directly beneath the value text without strikethroughs.

---

### D. Adjusting Multi-Column Rows (e.g. DOB, Gender, Age)

Sub-grid rows use nested tables with explicit percentage widths:

```tsx
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '2px' }}>
  <tbody>
    <tr>
      <td style={{ width: '18%', fontWeight: 'bold' }}>4. DOB:</td>
      <td style={{ width: '25%', borderBottom: '1px solid #000' }}>{patient?.dob || '—'}</td>
      
      <td style={{ width: '18%', fontWeight: 'bold', paddingLeft: '6px' }}>5. Gender:</td>
      <td style={{ width: '18%', borderBottom: '1px solid #000' }}>{patient?.gender || '—'}</td>
      
      <td style={{ width: '12%', fontWeight: 'bold', paddingLeft: '6px' }}>8. Age:</td>
      <td style={{ width: '9%', borderBottom: '1px solid #000' }}>{age}</td>
    </tr>
  </tbody>
</table>
```
- Ensure column percentages sum up to `100%`.

---

### E. Customizing Checkboxes & Radio Indicators

Checkboxes and radio selections use text characters (`[ X ]` and `[   ]`) to prevent alignment shifts:

```tsx
// Helper function in PrintRadiologyForm.tsx
const formatCheck = (val?: string) => (
  val === 'Yes' || val === 'Ya' 
    ? '[ X ] Yes   [   ] No' 
    : val === 'No' || val === 'Tidak' 
    ? '[   ] Yes   [ X ] No' 
    : '[   ] Yes   [   ] No'
);
```
- **To change checkbox style**: You can replace `[ X ]` with `[ ✓ ]` or `( • )` if desired.

---

### F. Modifying Section Headers (Grey Bar Backgrounds)

Section header titles use a shaded background bar:

```tsx
<div style={{ 
  backgroundColor: '#e6e6e6', 
  fontWeight: 'bold', 
  fontSize: '10px', 
  padding: '3px 5px', 
  marginBottom: '4px', 
  border: '1px solid #999' 
}}>
  20. RADIATION EXPOSURE
</div>
```
- **To change background color**: Modify `backgroundColor: '#e6e6e6'` (e.g., `#d0d0d0` for darker grey or `#eef2ff` for subtle blue).

---

### G. Adjusting Page Margins & Canvas Resolution

At the bottom of `PrintRadiologyForm.tsx`, the `handleDownload` function handles PDF generation:

```tsx
const canvas = await html2canvas(printRef.current, {
  scale: 2,                 // Resolution multiplier (2x for crisp print rendering)
  useCORS: true,
  backgroundColor: '#ffffff',
});

const pdf = new jsPDF({ 
  orientation: 'portrait', 
  unit: 'mm', 
  format: 'a4' 
});
```
- **If text looks blurry**: Increase `scale: 2` to `scale: 3`.
- **If output spills onto a 3rd page**: Reduce inner table paddings (`padding: '8mm'` to `6mm'`) or lower `minHeight` on clinical notes box.

---

## 4. Quick Troubleshooting Checklist

| Issue | Cause | Fix |
|---|---|---|
| **Strikethrough line across text** | Using `display: flex` with `borderBottom` on flex children | Convert to HTML `<table>` with `borderBottom: '1px solid #000'` on `<td>`. |
| **Blank 3rd page created** | Content height exceeds `297mm` A4 limit | Reduce `minHeight` of `textareaBox` or lower vertical padding on tables. |
| **Labels misaligned vertically** | Variable label text length without fixed column widths | Set explicit `width` (e.g. `width: '110px'`) on label `<td>` cells. |
| **Checkboxes overlapping text** | CSS flexbox gaps un-rendered in canvas | Use inline text characters `[ X ]` and `[   ]` inside `<td>` cells. |
