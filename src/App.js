import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileText, Calendar, User, CheckCircle, AlertCircle, XCircle, Download, Moon, Sun, Palette } from 'lucide-react';

const InvoiceGenerator = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [invoice, setInvoice] = useState({
    clientName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    lineItems: [
      { id: 1, description: '', quantity: 1, rate: 0 }
    ]
  });

  const [errors, setErrors] = useState({});
  const [validationStatus, setValidationStatus] = useState(null);
  const [removingItems, setRemovingItems] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const invoiceRef = useRef();

  // Template configurations
  const templates = {
    minimal: {
      name: 'Minimal',
      description: 'Clean and simple design'
    },
    professional: {
      name: 'Professional',
      description: 'Business-ready layout'
    },
    modern: {
      name: 'Modern',
      description: 'Contemporary styling'
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Calculate totals
  const subtotal = invoice.lineItems.reduce((sum, item) => {
    const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    return sum + itemTotal;
  }, 0);

  const gstAmount = subtotal * 0.18;
  const total = subtotal + gstAmount;

  // Add new line item with animation
  const addLineItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      rate: 0
    };
    setInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
    
    // Clear validation status when adding items
    if (validationStatus) {
      setValidationStatus(null);
    }
  };

  // Remove line item with animation
  const removeLineItem = (id) => {
    if (invoice.lineItems.length > 1) {
      // Add item to removing set for animation
      setRemovingItems(prev => new Set([...prev, id]));
      
      // Remove after animation completes
      setTimeout(() => {
        setInvoice(prev => ({
          ...prev,
          lineItems: prev.lineItems.filter(item => item.id !== id)
        }));
        setRemovingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        
        // Clear validation status when removing items
        if (validationStatus) {
          setValidationStatus(null);
        }
      }, 300);
    }
  };

  // Update line item
  const updateLineItem = (id, field, value) => {
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));

    // Clear errors when user starts typing
    if (errors[`${id}-${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${id}-${field}`]: null
      }));
    }
    
    // Clear validation status when editing
    if (validationStatus) {
      setValidationStatus(null);
    }
  };

  // Update invoice details
  const updateInvoice = (field, value) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Clear validation status when editing
    if (validationStatus) {
      setValidationStatus(null);
    }
  };

  // Comprehensive validation
  const validateForm = () => {
    const newErrors = {};
    const warnings = [];

    // Client name validation
    if (!invoice.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    } else if (invoice.clientName.trim().length < 2) {
      warnings.push('Client name seems very short');
    }

    // Date validation
    const invoiceDate = new Date(invoice.invoiceDate);
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setFullYear(today.getFullYear() + 1);
    
    if (invoiceDate > futureLimit) {
      warnings.push('Invoice date is more than a year in the future');
    }

    // Line items validation
    let hasValidItems = false;
    let totalItems = 0;
    
    invoice.lineItems.forEach((item, index) => {
      totalItems++;
      
      if (!item.description.trim()) {
        newErrors[`${item.id}-description`] = 'Description is required';
      } else if (item.description.trim().length < 3) {
        warnings.push(`Item ${index + 1}: Description seems very short`);
      }
      
      const quantity = parseFloat(item.quantity);
      if (!quantity || quantity <= 0) {
        newErrors[`${item.id}-quantity`] = 'Quantity must be greater than 0';
      } else if (quantity > 1000) {
        warnings.push(`Item ${index + 1}: Very high quantity (${quantity})`);
      }
      
      const rate = parseFloat(item.rate);
      if (rate === undefined || rate < 0) {
        newErrors[`${item.id}-rate`] = 'Rate must be 0 or greater';
      } else if (rate === 0) {
        warnings.push(`Item ${index + 1}: Rate is set to 0`);
      } else if (rate > 100000) {
        warnings.push(`Item ${index + 1}: Very high rate (${formatCurrency(rate)})`);
      }
      
      // Check if item contributes to total
      if (item.description.trim() && quantity > 0 && rate >= 0) {
        hasValidItems = true;
      }
    });

    // Business logic validation
    if (total === 0 && hasValidItems) {
      warnings.push('Invoice total is 0 - check your rates');
    } else if (total > 1000000) {
      warnings.push(`Very high invoice total: ${formatCurrency(total)}`);
    }

    if (totalItems > 20) {
      warnings.push(`High number of line items (${totalItems})`);
    }

    // Set validation status
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      if (warnings.length === 0) {
        setValidationStatus({
          type: 'success',
          message: 'Invoice is valid and ready to use!',
          details: [
            `Client: ${invoice.clientName}`,
            `Items: ${totalItems}`,
            `Total: ${formatCurrency(total)}`
          ]
        });
      } else {
        setValidationStatus({
          type: 'warning',
          message: 'Invoice is valid but has some warnings',
          details: warnings
        });
      }
    } else {
      setValidationStatus({
        type: 'error',
        message: `Found ${Object.keys(newErrors).length} error(s) that need to be fixed`,
        details: Object.values(newErrors)
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!validateForm()) {
      return;
    }

    setIsExporting(true);
    
    try {
      // Load html2canvas
      const script1 = document.createElement('script');
      script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(script1);
      
      // Load jsPDF
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script2);
      
      await new Promise(resolve => {
        let loaded = 0;
        const checkLoaded = () => {
          loaded++;
          if (loaded === 2) resolve();
        };
        script1.onload = checkLoaded;
        script2.onload = checkLoaded;
      });

      const element = invoiceRef.current;
      
      // Generate canvas from the invoice preview
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      // Generate filename
      const clientName = invoice.clientName.trim() || 'Client';
      const date = new Date(invoice.invoiceDate).toISOString().split('T')[0];
      const filename = `Invoice_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}_${selectedTemplate}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get validation icon and color
  const getValidationDisplay = () => {
    if (!validationStatus) return null;
    
    const icons = {
      success: <CheckCircle className="w-5 h-5 text-green-600" />,
      warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      error: <XCircle className="w-5 h-5 text-red-600" />
    };
    
    const colors = {
      success: darkMode 
        ? 'bg-green-900 border-green-700 text-green-200' 
        : 'bg-green-50 border-green-200 text-green-800',
      warning: darkMode 
        ? 'bg-yellow-900 border-yellow-700 text-yellow-200' 
        : 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: darkMode 
        ? 'bg-red-900 border-red-700 text-red-200' 
        : 'bg-red-50 border-red-200 text-red-800'
    };

    return (
      <div className={`mt-4 p-4 border rounded-lg ${colors[validationStatus.type]} transition-all duration-300 transform`}>
        <div className="flex items-start gap-3">
          {icons[validationStatus.type]}
          <div className="flex-1">
            <p className="font-medium">{validationStatus.message}</p>
            {validationStatus.details && validationStatus.details.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {validationStatus.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render template-specific preview
  const renderInvoicePreview = () => {
    const baseClasses = {
      container: `border rounded-lg p-8 transition-colors duration-300 ${
        darkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
      }`,
      header: darkMode ? 'text-white' : 'text-slate-800',
      subheader: darkMode ? 'text-gray-300' : 'text-slate-800',
      text: darkMode ? 'text-gray-200' : 'text-slate-700',
      border: darkMode ? 'border-gray-500' : 'border-slate-400',
      lightBorder: darkMode ? 'border-gray-600' : 'border-slate-200',
      accent: darkMode ? 'bg-gray-400' : 'bg-slate-700'
    };

    switch (selectedTemplate) {
      case 'minimal':
        return (
          <div className={baseClasses.container}>
            {/* Minimal Header */}
            <div className="mb-12">
              <h1 className={`text-2xl font-light tracking-widest uppercase ${baseClasses.header}`}>
                Invoice
              </h1>
            </div>

            {/* Minimal Info */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <p className={`text-xs uppercase tracking-wider mb-2 ${baseClasses.subheader}`}>
                  To
                </p>
                <p className={`text-xl font-light ${baseClasses.text}`}>
                  {invoice.clientName || 'Client Name'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs uppercase tracking-wider mb-2 ${baseClasses.subheader}`}>
                  Date
                </p>
                <p className={`text-xl font-light ${baseClasses.text}`}>
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
            </div>

            {/* Minimal Table */}
            <div className="mb-12">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${baseClasses.border}`}>
                    <th className={`text-left py-4 text-xs uppercase tracking-wider font-light ${baseClasses.subheader}`}>
                      Description
                    </th>
                    <th className={`text-center py-4 text-xs uppercase tracking-wider font-light ${baseClasses.subheader}`}>
                      Qty
                    </th>
                    <th className={`text-right py-4 text-xs uppercase tracking-wider font-light ${baseClasses.subheader}`}>
                      Rate
                    </th>
                    <th className={`text-right py-4 text-xs uppercase tracking-wider font-light ${baseClasses.subheader}`}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.filter(item => !removingItems.has(item.id)).map((item, index) => (
                    <tr key={item.id}>
                      <td className={`py-4 font-light ${baseClasses.text}`}>
                        {item.description || `Item ${index + 1}`}
                      </td>
                      <td className={`py-4 text-center font-light ${baseClasses.text}`}>
                        {item.quantity || 0}
                      </td>
                      <td className={`py-4 text-right font-light ${baseClasses.text}`}>
                        {formatCurrency(parseFloat(item.rate) || 0)}
                      </td>
                      <td className={`py-4 text-right font-light ${baseClasses.text}`}>
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Minimal Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className={`text-sm font-light ${baseClasses.text}`}>Subtotal</span>
                  <span className={`text-sm font-light ${baseClasses.text}`}>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm font-light ${baseClasses.text}`}>GST 18%</span>
                  <span className={`text-sm font-light ${baseClasses.text}`}>{formatCurrency(gstAmount)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t ${baseClasses.border}`}>
                  <span className={`font-light text-lg ${baseClasses.header}`}>Total</span>
                  <span className={`font-light text-lg ${baseClasses.header}`}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'modern':
        return (
          <div className={`border rounded-xl p-8 transition-colors duration-300 ${
            darkMode ? 'border-gray-600 bg-gradient-to-br from-gray-800 to-gray-700' : 'border-slate-300 bg-gradient-to-br from-white to-slate-50'
          }`}>
            {/* Modern Header */}
            <div className="text-center mb-10">
              <div className={`inline-block px-6 py-2 rounded-full mb-4 ${
                darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}>
                <h1 className="text-2xl font-bold text-white tracking-tight">INVOICE</h1>
              </div>
            </div>

            {/* Modern Info Cards */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className={`p-6 rounded-lg ${
                darkMode ? 'bg-gray-600 bg-opacity-50' : 'bg-white shadow-sm border border-slate-100'
              }`}>
                <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Bill To
                </h3>
                <p className={`text-lg font-semibold ${baseClasses.header}`}>
                  {invoice.clientName || 'Client Name'}
                </p>
              </div>
              <div className={`p-6 rounded-lg ${
                darkMode ? 'bg-gray-600 bg-opacity-50' : 'bg-white shadow-sm border border-slate-100'
              }`}>
                <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Invoice Date
                </h3>
                <p className={`text-lg font-semibold ${baseClasses.header}`}>
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
            </div>

            {/* Modern Table */}
            <div className={`rounded-lg overflow-hidden mb-8 ${
              darkMode ? 'bg-gray-600 bg-opacity-30' : 'bg-white border border-slate-100'
            }`}>
              <table className="w-full">
                <thead className={`${
                  darkMode ? 'bg-gray-600' : 'bg-slate-50'
                }`}>
                  <tr>
                    <th className={`text-left py-4 px-6 font-semibold text-sm ${baseClasses.subheader}`}>
                      Description
                    </th>
                    <th className={`text-center py-4 px-6 font-semibold text-sm ${baseClasses.subheader}`}>
                      Qty
                    </th>
                    <th className={`text-right py-4 px-6 font-semibold text-sm ${baseClasses.subheader}`}>
                      Rate
                    </th>
                    <th className={`text-right py-4 px-6 font-semibold text-sm ${baseClasses.subheader}`}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.filter(item => !removingItems.has(item.id)).map((item, index) => (
                    <tr key={item.id} className={`border-b ${baseClasses.lightBorder}`}>
                      <td className={`py-4 px-6 font-medium ${baseClasses.text}`}>
                        {item.description || `Item ${index + 1}`}
                      </td>
                      <td className={`py-4 px-6 text-center font-medium ${baseClasses.text}`}>
                        {item.quantity || 0}
                      </td>
                      <td className={`py-4 px-6 text-right font-medium ${baseClasses.text}`}>
                        {formatCurrency(parseFloat(item.rate) || 0)}
                      </td>
                      <td className={`py-4 px-6 text-right font-semibold ${baseClasses.text}`}>
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modern Totals */}
            <div className="flex justify-end">
              <div className={`p-6 rounded-lg w-80 ${
                darkMode ? 'bg-gray-600 bg-opacity-50' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={`font-medium ${baseClasses.text}`}>Subtotal:</span>
                    <span className={`font-semibold ${baseClasses.text}`}>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`font-medium ${baseClasses.text}`}>GST (18%):</span>
                    <span className={`font-semibold ${baseClasses.text}`}>{formatCurrency(gstAmount)}</span>
                  </div>
                  <div className={`flex justify-between pt-3 border-t ${baseClasses.border}`}>
                    <span className={`font-bold text-lg ${baseClasses.header}`}>Total:</span>
                    <span className={`font-bold text-lg ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Footer */}
            <div className="mt-12 text-center">
              <div className={`inline-block px-8 py-3 rounded-full ${
                darkMode ? 'bg-gray-600 bg-opacity-50' : 'bg-slate-100'
              }`}>
                <p className={`font-medium ${baseClasses.text}`}>
                  Thank you for your business!
                </p>
              </div>
            </div>
          </div>
        );

      default: // professional
        return (
          <div className={baseClasses.container}>
            {/* Professional Header */}
            <div className="text-center mb-8">
              <h1 className={`text-3xl font-bold mb-2 tracking-tight ${baseClasses.header}`}>INVOICE</h1>
              <div className={`w-20 h-1 mx-auto rounded ${baseClasses.accent}`}></div>
            </div>

            {/* Professional Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className={`font-semibold mb-2 text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                  Bill To:
                </h3>
                <p className={`font-medium text-lg ${baseClasses.text}`}>
                  {invoice.clientName || 'Client Name'}
                </p>
              </div>
              <div className="text-right">
                <h3 className={`font-semibold mb-2 text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                  Invoice Date:
                </h3>
                <p className={`font-medium text-lg ${baseClasses.text}`}>
                  {formatDate(invoice.invoiceDate)}
                </p>
              </div>
            </div>

            {/* Professional Table */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className={`border-b-2 ${baseClasses.border}`}>
                    <th className={`text-left py-3 font-semibold text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                      Description
                    </th>
                    <th className={`text-center py-3 font-semibold text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                      Qty
                    </th>
                    <th className={`text-right py-3 font-semibold text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                      Rate
                    </th>
                    <th className={`text-right py-3 font-semibold text-sm uppercase tracking-wide ${baseClasses.subheader}`}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.filter(item => !removingItems.has(item.id)).map((item, index) => (
                    <tr key={item.id} className={`border-b ${baseClasses.lightBorder}`}>
                      <td className={`py-3 font-medium ${baseClasses.text}`}>
                        {item.description || `Item ${index + 1}`}
                      </td>
                      <td className={`py-3 text-center font-medium ${baseClasses.text}`}>
                        {item.quantity || 0}
                      </td>
                      <td className={`py-3 text-right font-medium ${baseClasses.text}`}>
                        {formatCurrency(parseFloat(item.rate) || 0)}
                      </td>
                      <td className={`py-3 text-right font-semibold ${baseClasses.text}`}>
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Professional Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className={`flex justify-between py-2 border-b ${baseClasses.lightBorder}`}>
                  <span className={`font-medium ${baseClasses.text}`}>Subtotal:</span>
                  <span className={`font-semibold ${baseClasses.header}`}>{formatCurrency(subtotal)}</span>
                </div>
                <div className={`flex justify-between py-2 border-b ${baseClasses.lightBorder}`}>
                  <span className={`font-medium ${baseClasses.text}`}>GST (18%):</span>
                  <span className={`font-semibold ${baseClasses.header}`}>{formatCurrency(gstAmount)}</span>
                </div>
                <div className={`flex justify-between py-3 border-b-2 ${baseClasses.border}`}>
                  <span className={`font-bold text-lg ${baseClasses.header}`}>Total:</span>
                  <span className={`font-bold text-lg ${baseClasses.header}`}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Professional Footer */}
            <div className="mt-12 pt-6 text-center border-t border-dashed border-slate-300">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                Thank you for your business!
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <FileText className={`w-8 h-8 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`} />
            <h1 className={`text-3xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>Invoice Generator</h1>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`absolute right-0 p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                darkMode 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 shadow-lg' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 shadow-md border border-slate-200'
              }`}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>Create professional invoices with real-time preview</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Panel */}
          <div className={`rounded-lg shadow-sm border p-8 h-fit transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 flex items-center gap-2 tracking-tight ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>
              <User className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`} />
              Invoice Details
            </h2>

            {/* Template Selector */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 flex items-center gap-2 ${
                darkMode ? 'text-gray-300' : 'text-slate-700'
              }`}>
                <Palette className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`} />
                Invoice Template
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={`p-3 rounded-md text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                      selectedTemplate === key
                        ? darkMode
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-blue-600 text-white shadow-md'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{template.name}</div>
                      <div className={`text-xs mt-1 ${
                        selectedTemplate === key
                          ? 'text-blue-100'
                          : darkMode
                            ? 'text-gray-400'
                            : 'text-slate-500'
                      }`}>
                        {template.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Client Info */}
            <div className="space-y-4 mb-8">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  Client Name *
                </label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => updateInvoice('clientName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 font-medium ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-600' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  } ${
                    errors.clientName ? 'border-red-500 shake' : ''
                  }`}
                  placeholder="Enter client name"
                />
                {errors.clientName && (
                  <p className="mt-1 text-sm text-red-600 animate-pulse font-medium">{errors.clientName}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                  darkMode ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`} />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoice.invoiceDate}
                  onChange={(e) => updateInvoice('invoiceDate', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors font-medium ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>Line Items</h3>
                <button
                  onClick={addLineItem}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 font-medium ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-500' 
                      : 'bg-green-700 hover:bg-green-800'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {invoice.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-md transition-all duration-300 transform ${
                      darkMode 
                        ? 'border-gray-600 hover:border-gray-500 hover:shadow-sm bg-gray-750' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
                    } ${
                      removingItems.has(item.id) 
                        ? 'opacity-0 scale-95 -translate-x-4' 
                        : 'opacity-100 scale-100 translate-x-0'
                    }`}
                    style={{
                      animation: removingItems.has(item.id) ? 'slideOut 0.3s ease-in-out' : 'slideIn 0.3s ease-in-out'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-semibold ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        Item #{index + 1}
                      </span>
                      {invoice.lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          disabled={removingItems.has(item.id)}
                          className="text-red-600 hover:text-red-700 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className={`block text-xs font-medium mb-1 ${
                          darkMode ? 'text-gray-400' : 'text-slate-700'
                        }`}>
                          Description *
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 text-sm font-medium ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          } ${
                            errors[`${item.id}-description`] ? 'border-red-500' : ''
                          }`}
                          placeholder="Item description"
                        />
                        {errors[`${item.id}-description`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse font-medium">{errors[`${item.id}-description`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          darkMode ? 'text-gray-400' : 'text-slate-700'
                        }`}>
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 text-sm font-medium ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } ${
                            errors[`${item.id}-quantity`] ? 'border-red-500' : ''
                          }`}
                        />
                        {errors[`${item.id}-quantity`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse font-medium">{errors[`${item.id}-quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          darkMode ? 'text-gray-400' : 'text-slate-700'
                        }`}>
                          Rate (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 text-sm font-medium ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } ${
                            errors[`${item.id}-rate`] ? 'border-red-500' : ''
                          }`}
                        />
                        {errors[`${item.id}-rate`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse font-medium">{errors[`${item.id}-rate`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-right">
                      <span className={`text-sm font-semibold ${
                        darkMode ? 'text-gray-300' : 'text-slate-700'
                      }`}>
                        Total: {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={validateForm}
                className={`flex-1 py-3 px-4 text-white rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold ${
                  darkMode 
                    ? 'bg-gray-600 hover:bg-gray-500' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Validate Invoice
              </button>
              
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className={`flex items-center gap-2 py-3 px-4 text-white rounded-md disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold ${
                  isExporting 
                    ? 'bg-green-400' 
                    : darkMode 
                      ? 'bg-gray-600 hover:bg-gray-500' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {/* Validation Results */}
            {getValidationDisplay()}
          </div>

          {/* Preview Panel */}
          <div className={`rounded-lg shadow-sm border p-8 h-fit transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-xl font-semibold tracking-tight ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Preview - {templates[selectedTemplate].name}
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {templates[selectedTemplate].description}
              </div>
            </div>
            
            <div ref={invoiceRef}>
              {renderInvoicePreview()}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 20%, 40%, 60%, 80%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-2px);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
        }
        
        .bg-gray-750 {
          background-color: #374151;
        }
      `}</style>
    </div>
  );
};

export default InvoiceGenerator;