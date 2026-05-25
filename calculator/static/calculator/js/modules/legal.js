// ---------------- ЮРИДИЧНА УГОДА ----------------
    function checkLegalConsent() {
        const consent = localStorage.getItem('vet_disclaimer_accepted');
        if (!consent) {
            document.getElementById('legal-modal').classList.add('active');
        }
    }

    function acceptLegalTerms() {
        localStorage.setItem('vet_disclaimer_accepted', 'true');
        document.getElementById('legal-modal').classList.remove('active');
    }

    function openLegalModal() {
        const modal = document.getElementById('legal-modal');
        modal.classList.add('active');
    }