window.fbPixel = {
  pageView: () => window.fbq?.('track', 'PageView'),
  
  viewContent: (content_name, value = 97) =>
    window.fbq?.('track', 'ViewContent', {
      content_name, value, currency: 'BRL'
    }),
  
  lead: () => window.fbq?.('track', 'Lead'),
  
  completeRegistration: () => 
    window.fbq?.('track', 'CompleteRegistration'),
  
  provaGerada: (dados) =>
    window.fbq?.('trackCustom', 'ProvaGerada', dados),
  
  pdfBaixado: (tipo) =>
    window.fbq?.('trackCustom', 'PDFBaixado', { tipo }),
  
  upgradeClicado: (planoAtual) =>
    window.fbq?.('trackCustom', 'UpgradeClicado', { planoAtual })
};
