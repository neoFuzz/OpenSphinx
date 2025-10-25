import React from 'react';

/**
 * Privacy Policy display component
 * 
 * Renders a static page containing the privacy policy
 * for the OpenSphinx laser chess game.
 * 
 * @returns JSX element representing the privacy policy page
 */
export function Privacy() {
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">Privacy Policy</h4>
              <small className="text-muted">Last Updated: 2025/01/05</small>
            </div>
            <div className="card-body">
              <h5>1. Introduction</h5>
              <p>OpenSphinx ("we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our laser chess game service at <i>https://opensphinx.online</i>.</p>

              <h5>2. Information We Collect</h5>
              <p>We collect the following types of information:</p>
              <ul>
                <li><strong>Discord Account Information:</strong> When you authenticate via Discord, we collect your Discord ID, username, and avatar.</li>
                <li><strong>Game Data:</strong> We store game states, moves, and room information to provide multiplayer functionality.</li>
                <li><strong>Usage Data:</strong> We may collect information about how you interact with our Service, including IP addresses, browser type, and access times.</li>
              </ul>

              <h5>3. How We Use Your Information</h5>
              <p>We use the collected information to:</p>
              <ul>
                <li>Provide and maintain our Service</li>
                <li>Authenticate users and manage accounts</li>
                <li>Enable multiplayer gameplay and save game states</li>
                <li>Improve and optimize our Service</li>
                <li>Communicate with you about the Service</li>
              </ul>

              <h5>4. Data Storage and Security</h5>
              <p>We store your data on secure servers and implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>

              <h5>5. Third-Party Services</h5>
              <p>Our Service uses Discord for authentication. Please review Discord's Privacy Policy to understand how they handle your data. We are not responsible for the privacy practices of third-party services.</p>

              <h5>6. Data Retention</h5>
              <p>We retain your information for as long as necessary to provide our Service and comply with legal obligations. You may request deletion of your data by contacting us.</p>

              <h5>7. Your Rights</h5>
              <p>You have the right to:</p>
              <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Withdraw consent for data processing</li>
              </ul>

              <h5>8. Children's Privacy</h5>
              <p>Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>

              <h5>9. Changes to This Privacy Policy</h5>
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>

              <h5>10. Contact Us</h5>
              <p>If you have any questions about this Privacy Policy, please contact us through our GitHub repository.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
