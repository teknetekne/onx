// Submits the contact form to Google Apps Script without leaving the page.

document.addEventListener('DOMContentLoaded', () => {
    const maximumPitchDeckSize = 10 * 1024 * 1024;

    document.querySelectorAll('[data-contact-form]').forEach((form, index) => {
        const submitButton = form.querySelector('[data-submit-button]');
        const submitLabel = form.querySelector('[data-submit-label]');
        const status = form.querySelector('[data-form-status]');
        const pitchDeckInput = form.querySelector('[data-pitch-deck]');
        const pitchDeckName = form.querySelector('[data-pitch-deck-name]');
        const pitchDeckData = form.querySelector('[data-pitch-deck-data]');

        if (!submitButton || !submitLabel || !status || !pitchDeckInput || !pitchDeckName || !pitchDeckData) return;

        const defaultLabel = submitLabel.textContent;
        const endpointIsConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[a-z0-9_-]+\/exec$/i.test(form.action);
        const responseFrame = document.createElement('iframe');
        const responseFrameName = `onx-contact-form-response-${index}`;
        let responseTimeout;
        let submissionPending = false;
        let pitchDeckIsPrepared = false;

        responseFrame.name = responseFrameName;
        responseFrame.hidden = true;
        responseFrame.tabIndex = -1;
        responseFrame.setAttribute('aria-hidden', 'true');
        form.insertAdjacentElement('afterend', responseFrame);
        form.target = responseFrameName;

        const showStatus = (message, type) => {
            status.textContent = message;
            status.classList.toggle('is-success', type === 'success');
            status.classList.toggle('is-error', type === 'error');
        };

        const setSubmitting = isSubmitting => {
            submitButton.disabled = isSubmitting;
            submitButton.setAttribute('aria-busy', String(isSubmitting));
            submitLabel.textContent = isSubmitting ? form.dataset.sendingLabel : defaultLabel;
        };

        const finishSubmission = (success, message) => {
            window.clearTimeout(responseTimeout);
            submissionPending = false;
            pitchDeckIsPrepared = false;
            pitchDeckName.value = '';
            pitchDeckData.value = '';
            setSubmitting(false);

            if (success) form.reset();

            showStatus(message, success ? 'success' : 'error');
            status.focus({ preventScroll: true });
        };

        window.addEventListener('message', event => {
            const responseIsFromGoogle = event.origin === 'https://script.google.com'
                || event.origin.endsWith('.googleusercontent.com');
            const responseIsValid = event.data?.type === 'onx-form-response'
                && typeof event.data.success === 'boolean';

            if (!submissionPending || !responseIsFromGoogle || !responseIsValid) return;

            finishSubmission(
                event.data.success,
                event.data.success ? form.dataset.successMessage : form.dataset.errorMessage
            );
        });

        const preparePitchDeck = file => {
            const reader = new FileReader();

            reader.addEventListener('load', () => {
                const result = String(reader.result || '');
                const separatorIndex = result.indexOf(',');

                if (separatorIndex === -1) {
                    finishSubmission(false, form.dataset.errorMessage);
                    return;
                }

                pitchDeckName.value = file.name;
                pitchDeckData.value = result.slice(separatorIndex + 1);
                pitchDeckIsPrepared = true;
                submissionPending = false;
                form.requestSubmit();
            });
            reader.addEventListener('error', () => {
                finishSubmission(false, form.dataset.errorMessage);
            });
            reader.readAsDataURL(file);
        };

        form.addEventListener('submit', event => {
            showStatus('', null);

            if (!endpointIsConfigured) {
                event.preventDefault();
                showStatus(form.dataset.configMessage, 'error');
                status.focus({ preventScroll: true });
                return;
            }

            if (submissionPending) {
                event.preventDefault();
                return;
            }

            const pitchDeck = pitchDeckInput.files[0];

            if (pitchDeck && !pitchDeckIsPrepared) {
                event.preventDefault();

                const hasPdfExtension = pitchDeck.name.toLowerCase().endsWith('.pdf');
                const hasPdfMimeType = !pitchDeck.type || pitchDeck.type === 'application/pdf';
                const isPdf = hasPdfExtension && hasPdfMimeType;

                if (!isPdf) {
                    showStatus(form.dataset.fileTypeMessage, 'error');
                    status.focus({ preventScroll: true });
                    return;
                }

                if (pitchDeck.size > maximumPitchDeckSize) {
                    showStatus(form.dataset.fileSizeMessage, 'error');
                    status.focus({ preventScroll: true });
                    return;
                }

                submissionPending = true;
                setSubmitting(true);
                preparePitchDeck(pitchDeck);
                return;
            }

            submissionPending = true;
            setSubmitting(true);
            responseTimeout = window.setTimeout(() => {
                if (submissionPending) finishSubmission(false, form.dataset.errorMessage);
            }, 90000);
        });
    });
});
