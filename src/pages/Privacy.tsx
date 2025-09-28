import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-3xl p-8 md:p-12 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
              Privacy Policy
            </h1>
            
            <div className="prose prose-lg text-muted-foreground max-w-none">
              <p className="text-sm text-muted-foreground mb-8 text-center">
                Last updated: December 2024
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  make a purchase, or contact us for support.
                </p>
                
                <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
                <ul className="list-disc ml-6">
                  <li>Name, email address, and contact information</li>
                  <li>Payment information (processed securely by our payment partners)</li>
                  <li>Profile information and content you choose to share</li>
                  <li>Communication preferences and settings</li>
                </ul>

                <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Usage Information</h3>
                <ul className="list-disc ml-6">
                  <li>Device information and IP address</li>
                  <li>Browser type and operating system</li>
                  <li>Pages visited and time spent on our platform</li>
                  <li>Search queries and interaction data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc ml-6 mt-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices, updates, security alerts, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Communicate with you about products, services, offers, and events</li>
                  <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
                  <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties 
                  without your consent, except as described in this policy:
                </p>
                <ul className="list-disc ml-6 mt-4">
                  <li>With your consent or at your direction</li>
                  <li>With service providers who assist us in operating our platform</li>
                  <li>To comply with legal obligations or protect our rights</li>
                  <li>In connection with a business transaction (merger, acquisition, etc.)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction. 
                  However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes 
                  outlined in this policy, unless a longer retention period is required or permitted by law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
                <p>Depending on your location, you may have the following rights:</p>
                <ul className="list-disc ml-6 mt-4">
                  <li>Access and receive a copy of your personal information</li>
                  <li>Rectify inaccurate personal information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to or restrict processing of your personal information</li>
                  <li>Data portability rights</li>
                  <li>Withdraw consent where we rely on consent to process your information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Cookies and Tracking</h2>
                <p>
                  We use cookies and similar tracking technologies to collect and track information 
                  about your use of our services and to improve your experience.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">International Transfers</h2>
                <p>
                  Your information may be transferred to and maintained on computers located outside 
                  of your country where data protection laws may differ. We ensure appropriate safeguards 
                  are in place to protect your privacy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Changes to This Policy</h2>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any 
                  changes by posting the new privacy policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                  <br />
                  <strong>privacy@tingle.com</strong>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;