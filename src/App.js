import React, { useState } from 'react';
import { Plus, Trash2, FileText, Calendar, User, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const InvoiceGenerator = () => {
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
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Invoice Generator</h1>
          </div>
          <p className="text-gray-600">Create professional invoices with live preview</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Invoice Details
            </h2>

            {/* Client Info */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => updateInvoice('clientName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                    errors.clientName ? 'border-red-500 shake' : 'border-gray-300'
                  }`}
                  placeholder="Enter client name"
                />
                {errors.clientName && (
                  <p className="mt-1 text-sm text-red-600 animate-pulse">{errors.clientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoice.invoiceDate}
                  onChange={(e) => updateInvoice('invoiceDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Line Items</h3>
                <button
                  onClick={addLineItem}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {invoice.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-4 border border-gray-200 rounded-lg transition-all duration-300 transform ${
                      removingItems.has(item.id) 
                        ? 'opacity-0 scale-95 -translate-x-4' 
                        : 'opacity-100 scale-100 translate-x-0 hover:border-gray-300 hover:shadow-md'
                    }`}
                    style={{
                      animation: removingItems.has(item.id) ? 'slideOut 0.3s ease-in-out' : 'slideIn 0.3s ease-in-out'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        Item #{index + 1}
                      </span>
                      {invoice.lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          disabled={removingItems.has(item.id)}
                          className="text-red-500 hover:text-red-700 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description *
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm ${
                            errors[`${item.id}-description`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Item description"
                        />
                        {errors[`${item.id}-description`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse">{errors[`${item.id}-description`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm ${
                            errors[`${item.id}-quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`${item.id}-quantity`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse">{errors[`${item.id}-quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rate (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm ${
                            errors[`${item.id}-rate`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`${item.id}-rate`] && (
                          <p className="mt-1 text-xs text-red-600 animate-pulse">{errors[`${item.id}-rate`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-right">
                      <span className="text-sm font-medium text-gray-600">
                        Total: {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Button */}
            <button
              onClick={validateForm}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 active:scale-95 font-medium"
            >
              Validate Invoice
            </button>

            {/* Validation Results */}
            {getValidationDisplay()}
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-xl shadow-lg p-8 h-fit">
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
              {/* Invoice Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">INVOICE</h1>
                <div className="w-20 h-1 bg-indigo-600 mx-auto rounded"></div>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
                  <p className="text-gray-600">
                    {invoice.clientName || 'Client Name'}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-gray-700 mb-2">Invoice Date:</h3>
                  <p className="text-gray-600">
                    {formatDate(invoice.invoiceDate)}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 font-semibold text-gray-700">Description</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Qty</th>
                      <th className="text-right py-3 font-semibold text-gray-700">Rate</th>
                      <th className="text-right py-3 font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.filter(item => !removingItems.has(item.id)).map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-3 text-gray-600">
                          {item.description || `Item ${index + 1}`}
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {item.quantity || 0}
                        </td>
                        <td className="py-3 text-right text-gray-600">
                          {formatCurrency(parseFloat(item.rate) || 0)}
                        </td>
                        <td className="py-3 text-right text-gray-600">
                          {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-600">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (18%):</span>
                    <span className="text-gray-600">{formatCurrency(gstAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2">
                    <span className="font-bold text-gray-800 text-lg">Total:</span>
                    <span className="font-bold text-gray-800 text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              This is a live preview of your invoice
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
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
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default InvoiceGenerator;
