// Submits the contact form to Google Apps Script without leaving the page.

document.addEventListener('DOMContentLoaded', () => {
    const maximumPitchDeckSize = 10 * 1024 * 1024;

    const createRequestId = () => {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };

    document.querySelectorAll('[data-contact-form]').forEach((form, index) => {
        const submitButton = form.querySelector('[data-submit-button]');
        const submitLabel = form.querySelector('[data-submit-label]');
        const status = form.querySelector('[data-form-status]');
        const pitchDeckInput = form.querySelector('[data-pitch-deck]');
        const pitchDeckName = form.querySelector('[data-pitch-deck-name]');
        const pitchDeckData = form.querySelector('[data-pitch-deck-data]');
        const requestId = form.querySelector('[data-request-id]');

        if (!submitButton || !submitLabel || !status || !pitchDeckInput || !pitchDeckName || !pitchDeckData || !requestId) return;

        const defaultLabel = submitLabel.textContent;
        const endpointIsConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[a-z0-9_-]+\/exec$/i.test(form.action);
        const responseFrame = document.createElement('iframe');
        const responseFrameName = `onx-contact-form-response-${index}`;
        let responseTimeout;
        let submissionPending = false;
        let preparedPitchDeck = null;
        let pitchDeckPreparation = null;

        requestId.value = createRequestId();

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
            setSubmitting(false);

            if (success) {
                form.reset();
                preparedPitchDeck = null;
                pitchDeckPreparation = null;
                pitchDeckName.value = '';
                pitchDeckData.value = '';
                requestId.value = createRequestId();
            }

            showStatus(message, success ? 'success' : 'error');
            status.focus({ preventScroll: true });
        };

        window.addEventListener('message', event => {
            const responseIsFromGoogle = event.origin === 'https://script.google.com'
                || event.origin.endsWith('.googleusercontent.com');
            const responseIsValid = event.data?.type === 'onx-form-response'
                && typeof event.data.success === 'boolean'
                && event.data.requestId === requestId.value;

            if (!submissionPending || !responseIsFromGoogle || !responseIsValid) return;

            finishSubmission(
                event.data.success,
                event.data.success ? form.dataset.successMessage : form.dataset.errorMessage
            );
        });

        const validatePitchDeck = file => {
            const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
            const hasPdfMimeType = !file.type || file.type === 'application/pdf';

            if (!hasPdfExtension || !hasPdfMimeType) {
                return form.dataset.fileTypeMessage;
            }

            return file.size > maximumPitchDeckSize
                ? form.dataset.fileSizeMessage
                : '';
        };

        const preparePitchDeck = file => {
            if (preparedPitchDeck === file) return Promise.resolve(true);
            if (pitchDeckPreparation?.file === file) return pitchDeckPreparation.promise;

            const reader = new FileReader();
            const promise = new Promise(resolve => {
                reader.addEventListener('load', () => {
                    if (pitchDeckInput.files[0] !== file) {
                        resolve(false);
                        return;
                    }

                    const result = String(reader.result || '');
                    const separatorIndex = result.indexOf(',');

                    if (separatorIndex === -1) {
                        resolve(false);
                        return;
                    }

                    pitchDeckName.value = file.name;
                    pitchDeckData.value = result.slice(separatorIndex + 1);
                    preparedPitchDeck = file;
                    resolve(true);
                });
                reader.addEventListener('error', () => resolve(false));
                reader.readAsDataURL(file);
            });

            pitchDeckPreparation = { file, promise };
            promise.finally(() => {
                if (pitchDeckPreparation?.file === file) pitchDeckPreparation = null;
            });

            return promise;
        };

        pitchDeckInput.addEventListener('change', () => {
            const file = pitchDeckInput.files[0];

            preparedPitchDeck = null;
            pitchDeckName.value = '';
            pitchDeckData.value = '';
            showStatus('', null);

            if (!file) return;

            const validationMessage = validatePitchDeck(file);

            if (validationMessage) {
                pitchDeckInput.value = '';
                showStatus(validationMessage, 'error');
                status.focus({ preventScroll: true });
                return;
            }

            preparePitchDeck(file).then(success => {
                if (!success && pitchDeckInput.files[0] === file && !submissionPending) {
                    showStatus(form.dataset.errorMessage, 'error');
                    status.focus({ preventScroll: true });
                }
            });
        });

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

            if (pitchDeck) {
                const validationMessage = validatePitchDeck(pitchDeck);

                if (validationMessage) {
                    event.preventDefault();
                    showStatus(validationMessage, 'error');
                    status.focus({ preventScroll: true });
                    return;
                }
            }

            if (pitchDeck && preparedPitchDeck !== pitchDeck) {
                event.preventDefault();

                submissionPending = true;
                setSubmitting(true);
                preparePitchDeck(pitchDeck).then(success => {
                    submissionPending = false;

                    if (!success) {
                        finishSubmission(false, form.dataset.errorMessage);
                        return;
                    }

                    form.requestSubmit();
                });
                return;
            }

            if (!requestId.value) requestId.value = createRequestId();

            submissionPending = true;
            setSubmitting(true);
            responseTimeout = window.setTimeout(() => {
                if (submissionPending) finishSubmission(false, form.dataset.errorMessage);
            }, 90000);
        });
    });
});
