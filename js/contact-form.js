// Submits the contact form to Google Apps Script without leaving the page.

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-contact-form]').forEach((form, index) => {
        const submitButton = form.querySelector('[data-submit-button]');
        const submitLabel = form.querySelector('[data-submit-label]');
        const status = form.querySelector('[data-form-status]');

        if (!submitButton || !submitLabel || !status) return;

        const defaultLabel = submitLabel.textContent;
        const endpointIsConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[a-z0-9_-]+\/exec$/i.test(form.action);
        const responseFrame = document.createElement('iframe');
        const responseFrameName = `onx-contact-form-response-${index}`;
        let responseTimeout;
        let submissionPending = false;

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

        form.addEventListener('submit', event => {
            showStatus('', null);

            if (!endpointIsConfigured) {
                event.preventDefault();
                showStatus(form.dataset.configMessage, 'error');
                status.focus({ preventScroll: true });
                return;
            }

            submissionPending = true;
            setSubmitting(true);
            responseTimeout = window.setTimeout(() => {
                if (submissionPending) finishSubmission(false, form.dataset.errorMessage);
            }, 20000);
        });
    });
});
